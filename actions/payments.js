'use server'

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { isFirebaseConfigured, adminDb } from '@/lib/firebase/server';
import { getMonthlyGymOsCost } from '@/actions/db/pricing';

let razorpayInstance = null;

function getRazorpay() {
    if (!razorpayInstance && process.env.RAZORPAY_KEY_SECRET) {
        razorpayInstance = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpayInstance;
}

const PLAN_MAP = {
    'starter-monthly': 1999,
    'starter-annual': 17999,
    'pro-monthly': 3999,
    'pro-annual': 35999,
    'elite-monthly': 5999,
    'elite-annual': 53999,
};

export async function createRazorpayOrder(planId, gymId, isFirstPayment = false) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return { error: 'Razorpay is not configured' };
    }

    let baseAmount = 0;

    // V1 Usage-Based Pricing authoritative check
    if (planId === 'usage-v1') {
        const costData = await getMonthlyGymOsCost(gymId);
        if (!costData) return { error: 'Failed to retrieve live pricing data from server.' };
        baseAmount = costData.totalCost;
    } else {
        // Default amounts (Legacy Fallback)
        baseAmount = PLAN_MAP[planId];
        if (!baseAmount) return { error: 'Invalid plan selected' };

        // Pre-flight Check: Prevent Downgrading Below Member Limits on legacy plans
        if (isFirebaseConfigured() && adminDb) {
            const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
            const { getMemberLimit } = await import('@/lib/permissions');

            const sub = await getSubscriptionStatus(gymId);
            const targetLimit = getMemberLimit(planId);

            if (targetLimit < sub.activeMembers) {
                return { error: `Cannot downgrade. You have ${sub.activeMembers} active members, exceeding the ${targetLimit} limit of the selected legacy plan.` };
            }
        }
    }

    // Registration Fee Fallback
    if (isFirstPayment) {
        baseAmount += 2999;
    }

    const amountInPaise = Math.round(baseAmount * 100);
    const rzp = getRazorpay();

    try {
        const order = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${gymId}_${Date.now()}`
        });

        if (isFirebaseConfigured() && adminDb) {
            await adminDb.collection('payment_logs').add({
                order_id: order.id,
                gymId: gymId,
                plan: planId,
                amount: baseAmount,
                currency: 'INR',
                status: 'pending',
                created_at: new Date().toISOString()
            });
        }

        return { orderId: order.id, amountInPaise, currency: 'INR' };
    } catch (e) {
        console.error("Razorpay Order Creation Error:", e);
        return { error: 'Payment gateway communication failed.' };
    }
}

export async function verifyPaymentSignature(order_id, payment_id, signature, gymId, plan) {
    if (!process.env.RAZORPAY_KEY_SECRET) return { error: 'Not configured' };

    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === signature) {
        // Fallback frontend verification passed. Ensure Database gets synced.
        if (isFirebaseConfigured() && adminDb) {
            await adminDb.collection('transactions').add({
                order_id,
                payment_id,
                gymId,
                plan,
                status: 'captured',
                method: 'razorpay_frontend',
                verified_at: new Date().toISOString()
            });
            // Update Gym Subscription status
            const gymsRef = adminDb.collection('gyms').doc(gymId);
            const gymSnap = await gymsRef.get();
            if (gymSnap.exists) {
                // Calculate renewal bump
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

                await adminDb.collection('gym_subscriptions').doc(gymId).set({
                    plan: plan,
                    status: 'Active',
                    subscriptionExpiryDate: renewalDate.toISOString(),
                    isTrial: false
                }, { merge: true });
            }
        }
        return { success: true };
    }

    return { error: 'Invalid Payment Signature' };
}

// ----------------------------------------------------
// B2C: MEMBER PAYMENTS (Members paying Gyms)
// ----------------------------------------------------

export async function createMemberPaymentOrder(memberId, gymId, amountINR) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return { error: 'Razorpay is not configured' };
    }

    if (!amountINR || amountINR <= 0) return { error: 'Invalid amount' };

    // Always trust server calculated amounts natively inside production integrations.
    const amountInPaise = Math.round(amountINR * 100);
    const rzp = getRazorpay();

    try {
        const order = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `mem_rcpt_${memberId}_${Date.now()}`
        });

        if (isFirebaseConfigured() && adminDb) {
            await adminDb.collection('member_payment_logs').add({
                order_id: order.id,
                gymId,
                memberId,
                amount: amountINR,
                currency: 'INR',
                status: 'pending',
                created_at: new Date().toISOString(),
                paymentMethod: 'Razorpay'
            });
        }

        return { orderId: order.id, amountInPaise, currency: 'INR' };
    } catch (e) {
        console.error("Member Razorpay Order Error:", e);
        return { error: 'Payment gateway communication failed.' };
    }
}

export async function verifyMemberPaymentSignature(order_id, payment_id, signature, gymId, memberId) {
    if (!process.env.RAZORPAY_KEY_SECRET) return { error: 'Not configured' };

    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === signature) {
        if (isFirebaseConfigured() && adminDb) {
            // Find the pending log to securely fetch the server-generated amount
            const pendingQuery = await adminDb.collection('member_payment_logs').where('order_id', '==', order_id).limit(1).get()
            if (pendingQuery.empty) return { error: 'Invalid Payment Order Context' }

            const logData = pendingQuery.docs[0].data()
            const amount = logData.amount;

            // Commit formal Transaction
            const memRef = adminDb.collection('member_transactions').doc(payment_id);
            await memRef.set({
                order_id,
                payment_id,
                gymId,
                memberId,
                amount,
                status: 'PAID',
                method: 'Razorpay',
                verified_at: new Date().toISOString()
            })

            // Update pending log
            await pendingQuery.docs[0].ref.update({ status: 'PAID' })

            // Replicate Revenue metrics natively mapping the member standing
            const batch = adminDb.batch()
            const revRef = adminDb.collection('revenue').doc()
            batch.set(revRef, {
                userId: memberId,
                gymId,
                userName: 'Paid Member',
                userImage: null,
                amount: amount,
                outstanding: 0,
                planName: 'Membership Dues', // Flexible placeholder
                date: new Date().toISOString(),
                status: 'PAID',
                type: 'Subscription',
                method: 'Razorpay',
                is_recurring: false
            })

            // Clear outstanding dues in member record cleanly
            const memberDoc = adminDb.collection('members').doc(memberId)
            batch.update(memberDoc, { outstandingAmount: 0 })

            await batch.commit()
        }
        return { success: true };
    }
    return { error: 'Invalid Payment Signature' };
}

// Manual UPI Workflows
export async function submitDirectUpiPayment(memberId, gymId, amount) {
    if (isFirebaseConfigured() && adminDb) {
        await adminDb.collection('member_transactions').add({
            gymId,
            memberId,
            amount,
            status: 'PENDING_VERIFICATION',
            method: 'UPI',
            created_at: new Date().toISOString()
        })
        return { success: true }
    }
    return { error: 'Database disconnected' }
}
