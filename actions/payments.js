'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { authorize, getMemberForSession, getGymContext, audit, UNAUTHORIZED, NO_DB } from '@/lib/server/session'
import { computeMonthlyCost } from '@/lib/server/pricing'
import { computeSubscriptionStatus, applyGymSubscriptionPayment } from '@/lib/server/subscription'
import { getRazorpay, razorpayConfigStatus, verifyCheckoutSignature, confirmCapturedPayment, applyMemberPayment } from '@/lib/server/payments'
import { getMemberLimit } from '@/lib/plan-limits'
import { getOutstanding, toMoney } from '@/lib/domain/membership'
import { notify } from '@/lib/server/notify'

const PLAN_MAP = {
    'starter-monthly': 1999,
    'starter-annual': 17999,
    'pro-monthly': 3999,
    'pro-annual': 35999,
    'elite-monthly': 5999,
    'elite-annual': 53999,
}

function notConfigured() {
    const { missing } = razorpayConfigStatus()
    return { error: `Online payments are not configured yet (missing ${missing.join(', ')}).` }
}

// ====================================================================
// FLOW 1 — GYM PAYS BGM (owner subscription)
// Collections: payment_logs (orders) → transactions (captured payments)
// ====================================================================

export async function createRazorpayOrder(planId) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!razorpayConfigStatus().configured) return notConfigured()

    const gymId = session.gymId
    const sub = await computeSubscriptionStatus(gymId)
    if (!sub) return { error: 'Subscription record not found.' }

    let baseAmount = 0
    if (planId === 'usage-v1') {
        const costData = await computeMonthlyCost(gymId)
        baseAmount = costData.totalCost
    } else {
        baseAmount = PLAN_MAP[planId]
        if (!baseAmount) return { error: 'Invalid plan selected.' }
        const targetLimit = getMemberLimit(planId)
        if (targetLimit < sub.activeMembers) {
            return { error: `This plan allows ${targetLimit} members but you have ${sub.activeMembers}. Choose a larger plan.` }
        }
    }

    // The one-time registration fee is decided on the server, never by the browser.
    const includesRegistrationFee = !sub.registrationFeePaid
    if (includesRegistrationFee) {
        const pricing = await computeMonthlyCost(gymId)
        baseAmount += pricing.registrationFee
    }

    const amountInPaise = Math.round(baseAmount * 100)
    const rzp = await getRazorpay()
    try {
        const order = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `sub_${gymId}_${Date.now()}`.slice(0, 40),
            notes: { flow: 'gym_subscription', gymId, plan: planId },
        })
        await adminDb.collection('payment_logs').doc(order.id).set({
            order_id: order.id, gymId, plan: planId, amount: baseAmount, amountInPaise,
            includesRegistrationFee, currency: 'INR', status: 'pending',
            createdBy: session.uid, created_at: new Date().toISOString(),
        })
        return { orderId: order.id, amountInPaise, currency: 'INR', includesRegistrationFee }
    } catch (e) {
        console.error('Razorpay order creation failed:', e?.error?.description || e.message)
        return { error: 'Payment gateway communication failed. Please try again.' }
    }
}

export async function verifyPaymentSignature(order_id, payment_id, signature) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!razorpayConfigStatus().configured) return notConfigured()
    if (!verifyCheckoutSignature(order_id, payment_id, signature)) return { error: 'Invalid payment signature.' }

    const logRef = adminDb.collection('payment_logs').doc(String(order_id))
    let logSnap = await logRef.get()
    if (!logSnap.exists) {
        const q = await adminDb.collection('payment_logs').where('order_id', '==', order_id).limit(1).get()
        logSnap = q.empty ? null : q.docs[0]
    }
    if (!logSnap) return { error: 'Unknown payment order.' }
    const log = logSnap.data()
    if (log.gymId !== session.gymId) return UNAUTHORIZED

    const expectedPaise = log.amountInPaise || Math.round(toMoney(log.amount) * 100)
    const confirmed = await confirmCapturedPayment({ orderId: order_id, paymentId: payment_id, expectedPaise })
    if (!confirmed.ok) return { error: confirmed.error, pending: !!confirmed.pending }

    await applyGymSubscriptionPayment({
        gymId: log.gymId, plan: log.plan, orderId: order_id, paymentId: payment_id,
        amount: log.amount, includesRegistrationFee: !!log.includesRegistrationFee, source: 'checkout',
    })
    await logSnap.ref.update({ status: 'captured', payment_id, captured_at: new Date().toISOString() })
    await audit(session, 'GYM_SUBSCRIPTION_PAID', { plan: log.plan, amount: log.amount, paymentId: payment_id })
    revalidatePath('/dashboard/subscription')
    return { success: true }
}

// ====================================================================
// FLOW 2 — MEMBER PAYS THEIR GYM
// Collection: member_transactions (single ledger for Cash/UPI/Razorpay)
// ====================================================================

/** Payment options the signed-in member is allowed to see for their gym. */
export async function getMemberPaymentContext() {
    const session = await authorize('member')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }
    const { settings } = await getGymContext(session.gymId)

    const upiVisible = !!settings.upi_enabled && settings.upi_show_to_members !== false && !!settings.upi_id
    const historySnap = await adminDb.collection('member_transactions').where('memberId', '==', member.id).get()
    const history = historySnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(tx => tx.gymId === session.gymId && tx.status !== 'CREATED')
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 50)
        .map(tx => ({ id: tx.id, amount: toMoney(tx.amount), method: tx.method, status: tx.status, created_at: tx.created_at || null, resolved_at: tx.resolved_at || null }))

    return {
        success: true,
        memberId: member.id,
        name: member.data.name || '',
        email: member.data.email || '',
        phone: member.data.phone || '',
        outstanding: getOutstanding(member.data),
        pendingVerification: history.some(h => h.status === 'PENDING_VERIFICATION'),
        upi: upiVisible ? { enabled: true, upiId: settings.upi_id } : { enabled: false, upiId: null },
        razorpay: { enabled: !!settings.razorpay_enabled && razorpayConfigStatus().configured },
        history,
    }
}

export async function createMemberPaymentOrder() {
    const session = await authorize('member')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!razorpayConfigStatus().configured) return notConfigured()

    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }
    const { settings } = await getGymContext(session.gymId)
    if (!settings.razorpay_enabled) return { error: 'Your gym has not enabled online payments.' }

    // The amount is always the server-side outstanding balance.
    const amount = getOutstanding(member.data)
    if (!(amount > 0)) return { error: 'You have no outstanding balance.' }

    const amountInPaise = Math.round(amount * 100)
    const rzp = await getRazorpay()
    try {
        const order = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `mem_${member.id}_${Date.now()}`.slice(0, 40),
            notes: { flow: 'member_payment', gymId: session.gymId, memberId: member.id },
        })
        await adminDb.collection('member_transactions').doc(order.id).set({
            order_id: order.id, gymId: session.gymId, memberId: member.id, memberName: member.data.name || 'Member',
            amount, amountInPaise, currency: 'INR', method: 'Razorpay', status: 'CREATED', type: 'membership',
            created_at: new Date().toISOString(),
        })
        return { orderId: order.id, amountInPaise, currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID }
    } catch (e) {
        console.error('Member Razorpay order failed:', e?.error?.description || e.message)
        return { error: 'Payment gateway communication failed. Please try again.' }
    }
}

export async function verifyMemberPaymentSignature(order_id, payment_id, signature) {
    const session = await authorize('member')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!razorpayConfigStatus().configured) return notConfigured()
    if (!verifyCheckoutSignature(order_id, payment_id, signature)) return { error: 'Invalid payment signature.' }

    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }

    const txRef = adminDb.collection('member_transactions').doc(String(order_id))
    const txSnap = await txRef.get()
    if (!txSnap.exists) return { error: 'Unknown payment order.' }
    const tx = txSnap.data()
    if (tx.gymId !== session.gymId || tx.memberId !== member.id) return UNAUTHORIZED
    if (tx.status === 'PAID') return { success: true }

    const confirmed = await confirmCapturedPayment({ orderId: order_id, paymentId: payment_id, expectedPaise: tx.amountInPaise })
    if (!confirmed.ok) return { error: confirmed.error, pending: !!confirmed.pending }

    await applyMemberPayment({ txRef, gymId: tx.gymId, memberId: tx.memberId, amount: tx.amount, method: 'Razorpay', extra: { payment_id, source: 'checkout' } })
    await notify({ gymId: tx.gymId, targetRole: 'owner', title: 'Payment received', message: `${tx.memberName} paid ₹${tx.amount} online.`, url: '/dashboard/payments' })
    revalidatePath('/portal/billing')
    return { success: true }
}

/**
 * A member reports that they transferred money to the gym's UPI ID.
 * This is only a claim: the entry stays PENDING_VERIFICATION and the member's
 * dues are untouched until the owner confirms the money arrived.
 */
export async function submitDirectUpiPayment(reference) {
    const session = await authorize('member')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB

    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }
    const { settings } = await getGymContext(session.gymId)
    if (!settings.upi_enabled || settings.upi_show_to_members === false || !settings.upi_id) {
        return { error: 'Your gym does not accept direct UPI payments.' }
    }

    const amount = getOutstanding(member.data)
    if (!(amount > 0)) return { error: 'You have no outstanding balance.' }

    const utr = String(reference || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30)

    // One open claim per member: repeated taps must not create duplicates.
    const result = await adminDb.runTransaction(async (t) => {
        const open = await t.get(adminDb.collection('member_transactions')
            .where('memberId', '==', member.id).where('status', '==', 'PENDING_VERIFICATION').limit(1))
        if (!open.empty) return { duplicate: true }
        const ref = adminDb.collection('member_transactions').doc()
        t.set(ref, {
            gymId: session.gymId, memberId: member.id, memberName: member.data.name || 'Member',
            amount, method: 'UPI', status: 'PENDING_VERIFICATION', type: 'membership',
            utr: utr || null, created_at: new Date().toISOString(),
        })
        return { duplicate: false }
    })
    if (result.duplicate) return { error: 'You already have a payment waiting for verification by your gym.' }

    await notify({ gymId: session.gymId, targetRole: 'owner', title: 'UPI payment to verify', message: `${member.data.name || 'A member'} reported a UPI payment of ₹${amount}.`, url: '/dashboard/payments' })
    revalidatePath('/portal/billing')
    return { success: true }
}
