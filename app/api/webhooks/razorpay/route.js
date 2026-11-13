import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/server';
import { verifyWebhookSignature, applyMemberPayment, reverseMemberPayment } from '@/lib/server/payments';
import { applyGymSubscriptionPayment } from '@/lib/server/subscription';
import { sendPaymentConfirmationEmail } from '@/lib/email';
import { notify } from '@/lib/server/notify';

export const dynamic = 'force-dynamic';

// Razorpay webhook. Handles BOTH payment flows, told apart by which ledger the
// order id lives in:
//   payment_logs/{orderId}          → gym pays BGM
//   member_transactions/{orderId}   → member pays their gym
// Processing is idempotent (keyed by payment id / order id), so Razorpay
// retries and the checkout callback racing the webhook are both safe.
export async function POST(req) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    if (!adminDb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const rawBody = await req.text();
    if (!verifyWebhookSignature(rawBody, req.headers.get('x-razorpay-signature'))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    try {
        const payment = event?.payload?.payment?.entity;

        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            if (!payment?.id || !payment?.order_id) return NextResponse.json({ success: true, ignored: 'no payment entity' });
            if (payment.status !== 'captured') return NextResponse.json({ success: true, ignored: 'not captured' });
            await handleCaptured(payment);
        } else if (event.event === 'payment.failed') {
            if (payment?.order_id) await handleFailed(payment);
        } else if (event.event === 'refund.processed' || event.event === 'payment.refunded') {
            const paymentId = event?.payload?.refund?.entity?.payment_id || payment?.id;
            const orderId = payment?.order_id || null;
            if (paymentId) await handleRefund(paymentId, orderId);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        // A 500 makes Razorpay retry, which is what we want for transient failures.
        console.error('Razorpay webhook processing error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function findGymOrder(orderId) {
    const direct = await adminDb.collection('payment_logs').doc(orderId).get();
    if (direct.exists) return direct;
    const q = await adminDb.collection('payment_logs').where('order_id', '==', orderId).limit(1).get();
    return q.empty ? null : q.docs[0];
}

async function handleCaptured(payment) {
    const orderId = payment.order_id;

    const gymOrder = await findGymOrder(orderId);
    if (gymOrder) {
        const log = gymOrder.data();
        const expectedPaise = log.amountInPaise || Math.round(Number(log.amount) * 100);
        if (Number(payment.amount) !== Number(expectedPaise)) {
            console.error(`Razorpay webhook: amount mismatch for gym order ${orderId}`);
            return;
        }
        const res = await applyGymSubscriptionPayment({
            gymId: log.gymId, plan: log.plan, orderId, paymentId: payment.id,
            amount: log.amount, includesRegistrationFee: !!log.includesRegistrationFee, source: 'webhook',
        });
        await gymOrder.ref.update({ status: 'captured', payment_id: payment.id, captured_at: new Date().toISOString() });
        if (!res.alreadyProcessed) {
            const gymSnap = await adminDb.collection('gyms').doc(log.gymId).get();
            const gym = gymSnap.exists ? gymSnap.data() : {};
            const ownerEmail = gym.email || gym.ownerEmail;
            if (ownerEmail) {
                await sendPaymentConfirmationEmail({ ownerEmail, gymName: gym.gymName || gym.name || 'your gym', plan: log.plan, paymentId: payment.id, amount: log.amount }).catch(() => { });
            }
        }
        return;
    }

    const memberTxRef = adminDb.collection('member_transactions').doc(orderId);
    const memberTx = await memberTxRef.get();
    if (memberTx.exists) {
        const tx = memberTx.data();
        if (Number(payment.amount) !== Number(tx.amountInPaise)) {
            console.error(`Razorpay webhook: amount mismatch for member order ${orderId}`);
            return;
        }
        const res = await applyMemberPayment({ txRef: memberTxRef, gymId: tx.gymId, memberId: tx.memberId, amount: tx.amount, method: 'Razorpay', extra: { payment_id: payment.id, source: 'webhook' } });
        if (!res.alreadyProcessed) {
            await notify({ gymId: tx.gymId, targetRole: 'owner', title: 'Payment received', message: `${tx.memberName || 'A member'} paid ₹${tx.amount} online.`, url: '/dashboard/payments' });
        }
    }
}

async function handleFailed(payment) {
    const orderId = payment.order_id;
    const gymOrder = await findGymOrder(orderId);
    if (gymOrder && gymOrder.data().status === 'pending') {
        await gymOrder.ref.update({ status: 'failed', failure_reason: String(payment.error_description || '').slice(0, 200), failed_at: new Date().toISOString() });
        return;
    }
    const memberTxRef = adminDb.collection('member_transactions').doc(orderId);
    const memberTx = await memberTxRef.get();
    if (memberTx.exists && memberTx.data().status === 'CREATED') {
        await memberTxRef.update({ status: 'FAILED', failure_reason: String(payment.error_description || '').slice(0, 200), resolved_at: new Date().toISOString() });
    }
}

async function handleRefund(paymentId, orderId) {
    // Member payment refunded → dues are restored.
    let memberTxRef = orderId ? adminDb.collection('member_transactions').doc(orderId) : null;
    let memberTx = memberTxRef ? await memberTxRef.get() : null;
    if (!memberTx?.exists) {
        const q = await adminDb.collection('member_transactions').where('payment_id', '==', paymentId).limit(1).get();
        memberTx = q.empty ? null : q.docs[0];
        memberTxRef = memberTx?.ref || null;
    }
    if (memberTx?.exists) {
        const res = await reverseMemberPayment({ txRef: memberTxRef, reason: 'razorpay_refund' });
        if (!res.alreadyProcessed && !res.notFound) {
            const tx = memberTx.data();
            await notify({ gymId: tx.gymId, targetRole: 'owner', title: 'Payment refunded', message: `₹${tx.amount} paid by ${tx.memberName || 'a member'} was refunded.`, url: '/dashboard/payments' });
        }
        return;
    }

    // Gym subscription refunded → recorded and escalated; access is not revoked automatically.
    const txRef = adminDb.collection('transactions').doc(paymentId);
    const tx = await txRef.get();
    if (tx.exists && tx.data().status !== 'refunded') {
        await txRef.update({ status: 'refunded', refunded_at: new Date().toISOString() });
        await notify({ targetRole: 'super_admin', title: 'Subscription payment refunded', message: `Payment ${paymentId} for gym ${tx.data().gymId} was refunded. Review the gym's subscription.`, url: '/super-admin/subscriptions' });
    }
}
