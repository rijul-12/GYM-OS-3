'use server'

import { adminDb } from '@/lib/firebase/server'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'

export async function dispatchSubscriptionInstructions({ gymId, planName, planPrice }) {
    if (!adminDb) return;

    // Retrieve authenticated sender
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    if (!sessionStr) return;

    const session = JSON.parse(sessionStr)
    if (!session.email) return;

    // Build manual verification HTML
    const bodyHtml = `
        <p>Dear Gym Owner,</p>
        <p>Thank you for choosing to upgrade your GymOS facility to the <strong>${planName}</strong> plan.</p>
        <div style="background-color: #1a1a1a; padding: 24px; border-radius: 8px; border: 1px solid #333; margin: 24px 0;">
            <p style="margin-top: 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Subscription Amount</p>
            <p style="font-size: 28px; font-weight: bold; margin: 8px 0 24px; color: #ef4444;">₹${planPrice}</p>
            
            <p style="margin-top: 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Manual Payment Transfer Details</p>
            <div style="margin-top: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #333; color: #aaa;">UPI ID</td><td style="text-align: right; font-family: monospace; font-weight: bold;">rijul0027@oksbi</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #333; color: #aaa;">Bank Account</td><td style="text-align: right; font-family: monospace; font-weight: bold;">10099887766</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #333; color: #aaa;">IFSC Code</td><td style="text-align: right; font-family: monospace; font-weight: bold;">ICIC0001009</td></tr>
                    <tr><td style="padding: 8px 0; color: #aaa;">Beneficiary</td><td style="text-align: right; font-family: monospace; font-weight: bold;">GymOS Tech PVT LTD</td></tr>
                </table>
            </div>
        </div>
        <p>Once you have completed the transaction using the details above, click the button below to submit a verification request or enter your transaction reference ID in your dashboard.</p>
        <p>Your subscription will be automatically activated upon transaction clearance.</p>
    `;

    await sendEmail({
        to: session.email,
        subject: 'GymOS Subscription Payment Instructions',
        headline: 'Complete your GymOS Upgrade',
        greeting: 'Ready to scale your facility?',
        bodyHtml,
        button: { text: "I Have Completed Payment", url: "https://gymos.app/dashboard/subscription" }
    });
}

// Define the standard Trial duration globally
const TRIAL_DAYS = 14;

/**
 * Ensures a gym has a subscription document in Firebase.
 * If not, it implicitly generates a Free Trial starting today.
 */
export async function initializeSubscription(gymId) {
    if (!adminDb || gymId === 'DEMO') return null;

    const subRef = adminDb.collection('gym_subscriptions').doc(gymId);
    const subDoc = await subRef.get();

    if (!subDoc.exists) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

        const payload = {
            plan: 'Trial',
            status: 'Trial',
            trialStartDate: now.toISOString(),
            trialEndDate: trialEnd.toISOString(),
            subscriptionExpiryDate: null,
            createdAt: now.toISOString(),
        };

        await subRef.set(payload);
        return { gymId, ...payload, isReadOnly: false, daysRemaining: TRIAL_DAYS };
    }

    return await getSubscriptionStatus(gymId);
}

/**
 * Calculates current status and resolves the Read-Only flag
 */
export async function getSubscriptionStatus(gymId) {
    if (!adminDb || gymId === 'DEMO') return { isReadOnly: false, status: 'Active', plan: 'Demo', daysRemaining: 999 };

    const subDoc = await adminDb.collection('gym_subscriptions').doc(gymId).get();

    // If somehow missing (legacy gym), initialize it!
    if (!subDoc.exists) return await initializeSubscription(gymId);

    const data = subDoc.data();
    const now = new Date().getTime();

    let isReadOnly = true;
    let daysRemaining = 0;
    let currentPhase = 'Expired';

    if (data.status === 'Trial') {
        const end = new Date(data.trialEndDate).getTime();
        daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        if (end > now) {
            isReadOnly = false;
            currentPhase = 'Trial';
        }
    } else if (data.status === 'Active' && data.subscriptionExpiryDate) {
        const end = new Date(data.subscriptionExpiryDate).getTime();
        daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        if (end > now) {
            isReadOnly = false;
            currentPhase = 'Active';
        }
    }

    // Force overwrite status if expired dynamically
    if (isReadOnly && data.status !== 'Pending_Payment') {
        currentPhase = 'Expired';
    }

    // Compute exact plan limits and active members usage
    const { getMemberLimit } = await import('@/lib/permissions');
    const memberLimit = getMemberLimit(data.plan);

    let activeMembers = 0;
    try {
        const countSnap = await adminDb.collection('members')
            .where('gymId', '==', gymId)
            .where('status', 'in', ['Active', 'Pending'])
            .count().get();
        activeMembers = countSnap.data().count;
    } catch (e) {
        // Fallback for empty/legacy paths
        activeMembers = 0;
    }

    const usageProgressBar = memberLimit === 999999 ? 0 : Math.min(100, Math.round((activeMembers / memberLimit) * 100));

    return {
        ...data,
        id: gymId,
        isReadOnly,
        daysRemaining,
        currentPhase,
        activeMembers,
        memberLimit,
        usageProgressBar,
        storageUsed: '1.2 GB' // Hardcoded metric placeholder for storage limits
    };
}

/**
 * Called by Gym Owners to generate a manual payment request
 */
export async function createSubscriptionRequest(gymData) {
    if (!adminDb) return false;
    const { gymId, plan, amount, paymentProofUrl, referenceNumber } = gymData;

    await adminDb.collection('subscription_requests').add({
        gymId,
        plan,
        amount,
        paymentProofUrl: paymentProofUrl || null,
        referenceNumber: referenceNumber || 'MANUAL',
        requestDate: new Date().toISOString(),
        status: 'Pending'
    });

    // Mark current sub as pending
    await adminDb.collection('gym_subscriptions').doc(gymId).update({
        status: 'Pending_Payment'
    });

    return true;
}

/**
 * Super Admin Action: Fetch all requests
 */
export async function getSubscriptionRequests() {
    if (!adminDb) return [];

    // We also want to merge gym names to show in the UI, so we fetch gyms
    const [reqSnap, gymsSnap] = await Promise.all([
        adminDb.collection('subscription_requests').orderBy('requestDate', 'desc').get(),
        adminDb.collection('gyms').get()
    ]);

    const gyms = gymsSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().name;
        return acc;
    }, {});

    return reqSnap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            ...d,
            gymName: gyms[d.gymId] || d.gymId
        };
    });
}

/**
 * Super Admin Action: Approve Request
 */
export async function approveSubscription(requestId) {
    if (!adminDb) return;
    const reqDoc = await adminDb.collection('subscription_requests').doc(requestId).get();
    if (!reqDoc.exists) return;
    const data = reqDoc.data();

    // 1. Mark request approved
    await adminDb.collection('subscription_requests').doc(requestId).update({ status: 'Approved' });

    // 2. Lock-in 30 days of active subscription
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await adminDb.collection('gym_subscriptions').doc(data.gymId).set({
        plan: data.plan.split(' ')[0], // Base format
        status: 'Active',
        subscriptionExpiryDate: expiry.toISOString()
    }, { merge: true });

    // 3. Send Email
    const { sendEmail } = await import('@/lib/email');
    const settingsDoc = await adminDb.collection('gym_settings').doc(data.gymId).get();
    const email = settingsDoc.exists ? settingsDoc.data().ownerEmail || settingsDoc.data().email : null;

    if (email) {
        await sendEmail({
            to: email,
            subject: 'GymOS - Payment Approved & Subscription Activated',
            headline: 'Your Subscription is Active!',
            greeting: 'Welcome back to the Pro Tier,',
            bodyHtml: `<p>We have successfully verified your payment of ₹${data.amount}. Your <strong>${data.plan}</strong> plan is now fully active for the next 30 days.</p>`,
            button: { text: "Open GymOS Dashboard", url: "https://gymos.app/dashboard" }
        });
    }
}

/**
 * Super Admin Action: Reject Request
 */
export async function rejectSubscription(requestId) {
    if (!adminDb) return;
    const reqDoc = await adminDb.collection('subscription_requests').doc(requestId).get();
    if (!reqDoc.exists) return;
    const data = reqDoc.data();

    // 1. Mark request rejected
    await adminDb.collection('subscription_requests').doc(requestId).update({ status: 'Rejected' });

    // 2. We put the gym back to Expired since the payment failed
    await adminDb.collection('gym_subscriptions').doc(data.gymId).update({
        status: 'Expired'
    });

    // 3. Send Email
    const { sendEmail } = await import('@/lib/email');
    const settingsDoc = await adminDb.collection('gym_settings').doc(data.gymId).get();
    const email = settingsDoc.exists ? settingsDoc.data().ownerEmail || settingsDoc.data().email : null;

    if (email) {
        await sendEmail({
            to: email,
            subject: 'GymOS - Payment Verification Failed',
            headline: 'Payment Verification Failed',
            greeting: 'Important update regarding your account,',
            bodyHtml: `<p>We were unable to verify your manual payment reference (<strong>${data.referenceNumber}</strong>) for ₹${data.amount}.</p><p>Your account is currently locked in Read-Only mode. Please contact support or retry the payment.</p>`,
            button: { text: "Contact Support", url: "mailto:support@gymos.app" }
        });
    }
}
