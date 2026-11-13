'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { computeSubscriptionStatus } from '@/lib/server/subscription'
import { escapeHtml } from '@/lib/email'

const FALLBACK = { isReadOnly: false, status: null, plan: null, daysRemaining: null, currentPhase: 'Unknown', activeMembers: 0, memberLimit: 0, usageProgressBar: 0 }

/**
 * Subscription status for the caller's own gym.
 * Only a Super Admin may ask about another gym.
 */
export async function getSubscriptionStatus(gymIdParam) {
    const session = await getSession()
    if (!session || !adminDb) return FALLBACK
    const gymId = session.role === 'super_admin' ? gymIdParam : session.gymId
    if (!gymId) return FALLBACK
    const status = await computeSubscriptionStatus(gymId)
    return status ? plain(status) : FALLBACK
}

/** Super Admin: list manual subscription requests. */
export async function getSubscriptionRequests() {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []

    const [reqSnap, gymsSnap] = await Promise.all([
        adminDb.collection('subscription_requests').orderBy('requestDate', 'desc').limit(200).get(),
        adminDb.collection('gyms').get(),
    ])
    const gyms = Object.fromEntries(gymsSnap.docs.map(d => [d.id, d.data().gymName || d.data().name || d.id]))
    return plain(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), gymName: gyms[doc.data().gymId] || doc.data().gymId })))
}

async function ownerEmailFor(gymId) {
    const gymSnap = await adminDb.collection('gyms').doc(gymId).get()
    return gymSnap.exists ? (gymSnap.data().email || gymSnap.data().ownerEmail || null) : null
}

/** Super Admin: approve a manual payment request (idempotent). */
export async function approveSubscription(requestId) {
    const session = await authorize('super_admin')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (typeof requestId !== 'string' || !requestId) return { error: 'Invalid request.' }

    const reqRef = adminDb.collection('subscription_requests').doc(requestId)
    let data
    try {
        data = await adminDb.runTransaction(async (t) => {
            const snap = await t.get(reqRef)
            if (!snap.exists) throw new Error('Request not found.')
            const d = snap.data()
            if (d.status !== 'Pending') throw new Error(`Request was already ${String(d.status).toLowerCase()}.`)
            const subRef = adminDb.collection('gym_subscriptions').doc(d.gymId)
            const subSnap = await t.get(subRef)
            const currentExpiry = subSnap.exists && subSnap.data().status === 'Active' && subSnap.data().subscriptionExpiryDate
                ? new Date(subSnap.data().subscriptionExpiryDate).getTime() : 0
            const expiry = new Date(Math.max(Date.now(), currentExpiry) + 30 * 24 * 60 * 60 * 1000)
            t.update(reqRef, { status: 'Approved', resolvedAt: new Date().toISOString(), resolvedBy: session.uid })
            t.set(subRef, { plan: String(d.plan || 'starter').split(' ')[0], status: 'Active', subscriptionExpiryDate: expiry.toISOString(), isTrial: false }, { merge: true })
            return d
        })
    } catch (e) {
        return { error: e.message }
    }

    await audit(session, 'SUBSCRIPTION_REQUEST_APPROVED', { gymId: data.gymId, requestId, amount: data.amount })
    const email = await ownerEmailFor(data.gymId)
    if (email) {
        const { sendEmail } = await import('@/lib/email')
        const { getDashboardUrl } = await import('@/lib/url-builder')
        await sendEmail({
            to: email,
            subject: 'BGM — payment approved, subscription active',
            headline: 'Your subscription is active',
            bodyHtml: `<p>We verified your payment of ₹${escapeHtml(data.amount)}. Your <strong>${escapeHtml(data.plan)}</strong> plan is active for the next 30 days.</p>`,
            button: { text: 'Open BGM dashboard', url: getDashboardUrl() },
        })
    }
    revalidatePath('/super-admin/subscriptions')
    return { success: true }
}

/** Super Admin: reject a manual payment request. */
export async function rejectSubscription(requestId) {
    const session = await authorize('super_admin')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (typeof requestId !== 'string' || !requestId) return { error: 'Invalid request.' }

    const reqRef = adminDb.collection('subscription_requests').doc(requestId)
    let data
    try {
        data = await adminDb.runTransaction(async (t) => {
            const snap = await t.get(reqRef)
            if (!snap.exists) throw new Error('Request not found.')
            const d = snap.data()
            if (d.status !== 'Pending') throw new Error(`Request was already ${String(d.status).toLowerCase()}.`)
            const subRef = adminDb.collection('gym_subscriptions').doc(d.gymId)
            const subSnap = await t.get(subRef)
            t.update(reqRef, { status: 'Rejected', resolvedAt: new Date().toISOString(), resolvedBy: session.uid })
            // Only undo the "pending payment" marker; never cut short a subscription that is still valid.
            if (subSnap.exists && subSnap.data().status === 'Pending_Payment') {
                const prev = subSnap.data()
                const trialValid = prev.trialEndDate && new Date(prev.trialEndDate).getTime() > Date.now()
                t.update(subRef, { status: trialValid ? 'Trial' : 'Expired' })
            }
            return d
        })
    } catch (e) {
        return { error: e.message }
    }

    await audit(session, 'SUBSCRIPTION_REQUEST_REJECTED', { gymId: data.gymId, requestId })
    const email = await ownerEmailFor(data.gymId)
    if (email) {
        const { sendEmail, SUPPORT_EMAIL } = await import('@/lib/email')
        await sendEmail({
            to: email,
            subject: 'BGM — payment could not be verified',
            headline: 'Payment verification failed',
            bodyHtml: `<p>We were unable to verify your payment reference (<strong>${escapeHtml(data.referenceNumber)}</strong>) for ₹${escapeHtml(data.amount)}.</p><p>Please retry the payment or contact support.</p>`,
            button: { text: 'Contact support', url: `mailto:${SUPPORT_EMAIL}` },
        })
    }
    revalidatePath('/super-admin/subscriptions')
    return { success: true }
}

/** Super Admin: extend a gym's trial. */
export async function extendGymTrial(gymId, newExpiryDateStr, reason) {
    const session = await authorize('super_admin')
    if (!session) return { success: false, error: UNAUTHORIZED.error }
    if (!adminDb || !gymId) return { success: false, error: 'Database unavailable' }

    const newExpiry = new Date(newExpiryDateStr)
    if (isNaN(newExpiry.getTime())) return { success: false, error: 'Invalid date.' }
    if (newExpiry.getTime() <= Date.now()) return { success: false, error: 'The new trial end date must be in the future.' }
    if (newExpiry.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) return { success: false, error: 'A trial cannot be extended by more than one year.' }

    try {
        const gymRef = adminDb.collection('gyms').doc(gymId)
        const gymSnap = await gymRef.get()
        if (!gymSnap.exists) return { success: false, error: 'Gym not found.' }

        await computeSubscriptionStatus(gymId) // ensures the subscription document exists
        const subRef = adminDb.collection('gym_subscriptions').doc(gymId)
        const subDoc = await subRef.get()
        if (subDoc.exists && subDoc.data().status === 'Active' && subDoc.data().subscriptionExpiryDate && new Date(subDoc.data().subscriptionExpiryDate).getTime() > Date.now()) {
            return { success: false, error: 'This gym has an active paid subscription; a trial cannot be applied.' }
        }
        const oldExpiry = subDoc.exists ? subDoc.data().trialEndDate : null
        const iso = newExpiry.toISOString()

        const batch = adminDb.batch()
        batch.set(subRef, { trialEndDate: iso, status: 'Trial' }, { merge: true })
        batch.update(gymRef, { trialEndDate: iso, subscriptionStatus: 'Trial', isTrial: true })
        await batch.commit()

        await audit(session, 'TRIAL_EXTENSION', { gymId, from: oldExpiry, to: iso, reason: String(reason || '').slice(0, 500) })
        revalidatePath('/super-admin/gyms')
        return { success: true }
    } catch (e) {
        return { success: false, error: e.message }
    }
}
