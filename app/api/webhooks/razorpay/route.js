import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { isFirebaseConfigured, adminDb } from '@/lib/firebase/server';
import { sendPaymentConfirmationEmail } from '@/lib/email'

export async function POST(req) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    try {
        const textBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(textBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error("Invalid Webhook Signature Detected");
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(textBody);
        console.log(`[RAZORPAY_WEBHOOK] Received event: ${event.event}`);

        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const paymentId = event.payload.payment.entity.id;
            const orderId = event.payload.payment.entity.order_id;
            const amount = event.payload.payment.entity.amount / 100;

            if (isFirebaseConfigured() && adminDb) {
                // Find pending log
                const pendingLogs = await adminDb.collection('payment_logs').where('order_id', '==', orderId).limit(1).get();
                if (!pendingLogs.empty) {
                    const logData = pendingLogs.docs[0].data();
                    const gymId = logData.gymId;
                    const plan = logData.plan || 'Unknown Plan';

                    // Insert final verified transaction
                    await adminDb.collection('transactions').doc(paymentId).set({
                        order_id: orderId,
                        payment_id: paymentId,
                        gymId: gymId,
                        plan: plan,
                        amount: amount,
                        currency: 'INR',
                        status: 'captured',
                        method: 'webhook',
                        verified_at: new Date().toISOString()
                    });

                    // Update Gym status globally
                    const gymsRef = adminDb.collection('gyms').doc(gymId);
                    const gymSnap = await gymsRef.get();
                    if (gymSnap.exists) {
                        const days = plan.includes('annual') ? 365 : 30;
                        const renewalDate = new Date();
                        renewalDate.setDate(renewalDate.getDate() + days);

                        await gymsRef.update({
                            status: 'Active',
                            subscriptionStatus: 'Active',
                            plan: plan,
                            renewalDate: renewalDate.toISOString(),
                            isTrial: false
                        });

                        // Specifically sync the gym_subscriptions state model for the frontend
                        await adminDb.collection('gym_subscriptions').doc(gymId).set({
                            plan: plan,
                            status: 'Active',
                            subscriptionExpiryDate: renewalDate.toISOString(),
                            isTrial: false
                        }, { merge: true });

                        // Optionally triggers invoice email
                        try {
                            const gymData = gymSnap.data();
                            await sendPaymentConfirmationEmail({
                                ownerEmail: gymData.ownerEmail,
                                gymName: gymData.gymName,
                                plan: plan,
                                paymentId: paymentId,
                                amount: amount
                            });
                        } catch (e) {
                            // Ignore email failure so webhook succeeds
                        }
                    }

                    // Mark old log as captured
                    await pendingLogs.docs[0].ref.update({ status: 'captured' });
                }
            }
        }

        if (event.event === 'payment.failed') {
            console.log(`[RAZORPAY_WEBHOOK] Payment Failed for Order: ${event.payload?.payment?.entity?.order_id}`);
            // Add logic here to notify owner of payment failure if needed
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
