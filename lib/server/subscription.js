// Gym → BGM subscription state (server only, not a Server Action).
import { adminDb } from '@/lib/firebase/server'
import { getMemberLimit } from '@/lib/plan-limits'
import { BILLABLE_STATUSES } from '@/lib/domain/membership'

const TRIAL_MONTHS = 2
const DAY_MS = 24 * 60 * 60 * 1000

async function ensureSubscriptionDoc(gymId) {
    const subRef = adminDb.collection('gym_subscriptions').doc(gymId)
    const subDoc = await subRef.get()
    if (subDoc.exists) return subDoc.data()

    // Legacy gyms without a subscription document: derive the trial from the gym record.
    const gymSnap = await adminDb.collection('gyms').doc(gymId).get()
    if (!gymSnap.exists) return null
    const gym = gymSnap.data()
    const now = new Date()
    let trialEnd = gym.trialEndDate ? new Date(gym.trialEndDate) : null
    if (!trialEnd || isNaN(trialEnd.getTime())) {
        trialEnd = new Date(gym.createdAt || now)
        if (isNaN(trialEnd.getTime())) trialEnd = new Date(now)
        trialEnd.setMonth(trialEnd.getMonth() + TRIAL_MONTHS)
    }
    const payload = {
        plan: 'Trial',
        status: 'Trial',
        trialStartDate: gym.createdAt || now.toISOString(),
        trialEndDate: trialEnd.toISOString(),
        subscriptionExpiryDate: null,
        createdAt: now.toISOString(),
    }
    await subRef.set(payload, { merge: true })
    return payload
}

export function newTrialSubscription(now = new Date()) {
    const trialEnd = new Date(now)
    trialEnd.setMonth(trialEnd.getMonth() + TRIAL_MONTHS)
    return {
        plan: 'Trial',
        status: 'Trial',
        trialStartDate: now.toISOString(),
        trialEndDate: trialEnd.toISOString(),
        subscriptionExpiryDate: null,
        createdAt: now.toISOString(),
    }
}

/** Calculates the current phase and whether the gym is in read-only mode. */
export async function computeSubscriptionStatus(gymId) {
    if (!adminDb || !gymId) return null
    const data = await ensureSubscriptionDoc(gymId)
    if (!data) return null

    const now = Date.now()
    let isReadOnly = true
    let daysRemaining = 0
    let currentPhase = 'Expired'

    if (data.status === 'Trial' && data.trialEndDate) {
        const end = new Date(data.trialEndDate).getTime()
        daysRemaining = Math.max(0, Math.ceil((end - now) / DAY_MS))
        if (end > now) { isReadOnly = false; currentPhase = 'Trial' }
    } else if (data.status === 'Active' && data.subscriptionExpiryDate) {
        const end = new Date(data.subscriptionExpiryDate).getTime()
        daysRemaining = Math.max(0, Math.ceil((end - now) / DAY_MS))
        if (end > now) { isReadOnly = false; currentPhase = 'Active' }
    } else if (data.status === 'Pending_Payment') {
        currentPhase = 'Pending_Payment'
    }

    const memberLimit = getMemberLimit(data.plan, currentPhase)
    let activeMembers = 0
    try {
        const countSnap = await adminDb.collection('members')
            .where('gymId', '==', gymId)
            .where('status', 'in', BILLABLE_STATUSES)
            .count().get()
        activeMembers = countSnap.data().count
    } catch { activeMembers = 0 }

    const usageProgressBar = memberLimit >= 999999 ? 0 : Math.min(100, Math.round((activeMembers / memberLimit) * 100))

    return {
        plan: data.plan || null,
        status: data.status || null,
        trialStartDate: data.trialStartDate || null,
        trialEndDate: data.trialEndDate || null,
        subscriptionExpiryDate: data.subscriptionExpiryDate || null,
        registrationFeePaid: !!data.registrationFeePaid,
        id: gymId,
        isReadOnly,
        daysRemaining,
        currentPhase,
        activeMembers,
        memberLimit,
        usageProgressBar,
    }
}

/** Throws-free write guard used by owner mutations. */
export async function assertGymWritable(gymId) {
    const status = await computeSubscriptionStatus(gymId)
    if (!status) return { ok: false, error: 'Gym subscription could not be loaded.' }
    if (status.isReadOnly) return { ok: false, error: 'Your BGM subscription has expired. The account is read-only until it is renewed.', status }
    return { ok: true, status }
}

/**
 * Idempotently records a verified gym → BGM payment and extends the
 * subscription. Safe to call from both the checkout callback and the webhook:
 * the transaction document is keyed by the Razorpay payment id.
 */
export async function applyGymSubscriptionPayment({ gymId, plan, orderId, paymentId, amount, includesRegistrationFee, source }) {
    const txRef = adminDb.collection('transactions').doc(paymentId)
    const subRef = adminDb.collection('gym_subscriptions').doc(gymId)
    const gymRef = adminDb.collection('gyms').doc(gymId)

    return adminDb.runTransaction(async (t) => {
        const [txSnap, subSnap, gymSnap] = await Promise.all([t.get(txRef), t.get(subRef), t.get(gymRef)])
        if (txSnap.exists && txSnap.data().status === 'captured') return { alreadyProcessed: true }
        if (!gymSnap.exists) throw new Error('Gym not found for payment')

        const months = String(plan).includes('annual') ? 12 : 1
        const nowMs = Date.now()
        const currentExpiry = subSnap.exists && subSnap.data().status === 'Active' && subSnap.data().subscriptionExpiryDate
            ? new Date(subSnap.data().subscriptionExpiryDate).getTime() : 0
        const base = new Date(Math.max(nowMs, currentExpiry || 0))
        base.setMonth(base.getMonth() + months)
        const renewal = base.toISOString()

        t.set(txRef, {
            order_id: orderId, payment_id: paymentId, gymId, plan, amount,
            currency: 'INR', status: 'captured', method: 'razorpay', source,
            verified_at: new Date().toISOString(),
        }, { merge: true })
        t.set(subRef, {
            plan, status: 'Active', subscriptionExpiryDate: renewal, isTrial: false,
            ...(includesRegistrationFee ? { registrationFeePaid: true } : {}),
            lastPaymentId: paymentId, updatedAt: new Date().toISOString(),
        }, { merge: true })
        t.update(gymRef, { subscriptionStatus: 'Active', plan, renewalDate: renewal, isTrial: false })
        return { alreadyProcessed: false, renewal }
    })
}
