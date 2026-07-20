'use server'

import { adminDb } from '@/lib/firebase/server'
import { cookies } from 'next/headers'

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

    return {
        ...data,
        id: gymId,
        isReadOnly,
        daysRemaining,
        currentPhase
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
    const { sendEmail } = await import('@/lib/mail');
    const settingsDoc = await adminDb.collection('gym_settings').doc(data.gymId).get();
    const email = settingsDoc.exists ? settingsDoc.data().ownerEmail || settingsDoc.data().email : null;

    if (email) {
        await sendEmail({
            to: email,
            subject: 'GymOS - Payment Approved & Subscription Activated',
            html: `<h3>Your GymOS Subscription is Active!</h3><p>We have successfully verified your payment of ₹${data.amount}. Your ${data.plan} plan is now active for the next 30 days.</p>`
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
    const { sendEmail } = await import('@/lib/mail');
    const settingsDoc = await adminDb.collection('gym_settings').doc(data.gymId).get();
    const email = settingsDoc.exists ? settingsDoc.data().ownerEmail || settingsDoc.data().email : null;

    if (email) {
        await sendEmail({
            to: email,
            subject: 'GymOS - Payment Verification Failed',
            html: `<h3>Payment Verification Failed</h3><p>We were unable to verify your manual payment reference (${data.referenceNumber}) for ₹${data.amount}. Your account is currently locked in Read-Only mode. Please contact support or retry the payment.</p>`
        });
    }
}
