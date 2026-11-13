// Shared payment helpers (server only, not Server Actions).
import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/server'
import { computeDues, toMoney } from '@/lib/domain/membership'

let razorpayInstance = null

export function razorpayConfigStatus() {
    const missing = []
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) missing.push('NEXT_PUBLIC_RAZORPAY_KEY_ID')
    if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET')
    return { configured: missing.length === 0, missing }
}

export async function getRazorpay() {
    if (!razorpayConfigStatus().configured) return null
    if (!razorpayInstance) {
        const Razorpay = (await import('razorpay')).default
        razorpayInstance = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    }
    return razorpayInstance
}

export function safeEqualHex(a, b) {
    try {
        const ba = Buffer.from(String(a), 'hex')
        const bb = Buffer.from(String(b), 'hex')
        return ba.length > 0 && ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
    } catch {
        return false
    }
}

export function verifyCheckoutSignature(orderId, paymentId, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET || !orderId || !paymentId || !signature) return false
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
    return safeEqualHex(expected, signature)
}

export function verifyWebhookSignature(rawBody, signature) {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET || !signature) return false
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')
    return safeEqualHex(expected, signature)
}

/**
 * Confirms with Razorpay's API that the payment really belongs to the order,
 * is for the expected amount and has been captured. A checkout callback on
 * its own is never treated as proof of payment.
 */
export async function confirmCapturedPayment({ orderId, paymentId, expectedPaise }) {
    const rzp = await getRazorpay()
    if (!rzp) return { ok: false, error: 'Razorpay is not configured.' }
    let payment
    try {
        payment = await rzp.payments.fetch(paymentId)
    } catch {
        return { ok: false, error: 'Could not confirm the payment with Razorpay.' }
    }
    if (payment.order_id !== orderId) return { ok: false, error: 'Payment does not belong to this order.' }
    if (Number(payment.amount) !== Number(expectedPaise)) return { ok: false, error: 'Payment amount does not match the order.' }
    if (payment.status === 'authorized') {
        try {
            payment = await rzp.payments.capture(paymentId, expectedPaise, payment.currency || 'INR')
        } catch {
            return { ok: false, pending: true, error: 'Payment is authorised but not yet captured. It will be confirmed automatically.' }
        }
    }
    if (payment.status !== 'captured') return { ok: false, error: `Payment is ${payment.status}, not captured.` }
    return { ok: true, payment }
}

/**
 * Applies a confirmed member payment to the ledger and the member's dues in a
 * single Firestore transaction. Idempotent on the ledger document: if it is
 * already PAID nothing is applied twice.
 *
 * `txRef` is the member_transactions document for this payment.
 */
export async function applyMemberPayment({ txRef, gymId, memberId, amount, method, extra = {} }) {
    const memberRef = adminDb.collection('members').doc(memberId)
    const paid = toMoney(amount)
    if (!(paid > 0)) throw new Error('Invalid payment amount')

    return adminDb.runTransaction(async (t) => {
        const [txSnap, memberSnap] = await Promise.all([t.get(txRef), t.get(memberRef)])
        if (txSnap.exists && txSnap.data().status === 'PAID') return { alreadyProcessed: true }
        if (txSnap.exists && txSnap.data().gymId && txSnap.data().gymId !== gymId) throw new Error('Payment belongs to another gym')

        const now = new Date().toISOString()
        let memberName = txSnap.exists ? (txSnap.data().memberName || null) : null
        let newOutstanding = null

        if (memberSnap.exists && memberSnap.data().gymId === gymId) {
            const m = memberSnap.data()
            memberName = m.name || memberName
            const fee = toMoney(m.paymentFee)
            const prevPaid = toMoney(m.paymentAmount)
            const prevOutstanding = Math.max(0, toMoney(m.outstandingAmount))
            newOutstanding = Math.max(0, Math.round((prevOutstanding - paid) * 100) / 100)
            const totalPaid = Math.round((prevPaid + paid) * 100) / 100
            const dues = computeDues(fee > 0 ? fee : totalPaid + newOutstanding, totalPaid)
            t.update(memberRef, {
                paymentAmount: totalPaid,
                outstandingAmount: newOutstanding,
                payment_status: newOutstanding === 0 ? 'Paid' : dues.paymentStatus,
                lastPaymentAt: now,
            })
        }

        t.set(txRef, {
            gymId, memberId, memberName: memberName || 'Member',
            amount: paid, method, status: 'PAID', type: 'membership',
            resolved_at: now,
            ...(txSnap.exists ? {} : { created_at: now }),
            ...extra,
        }, { merge: true })

        return { alreadyProcessed: false, newOutstanding }
    })
}

/** Reverses a previously applied member payment (refund / chargeback). */
export async function reverseMemberPayment({ txRef, reason = 'refund' }) {
    return adminDb.runTransaction(async (t) => {
        const txSnap = await t.get(txRef)
        if (!txSnap.exists) return { notFound: true }
        const tx = txSnap.data()
        if (tx.status !== 'PAID') return { alreadyProcessed: true }
        const memberRef = adminDb.collection('members').doc(tx.memberId)
        const memberSnap = await t.get(memberRef)
        if (memberSnap.exists && memberSnap.data().gymId === tx.gymId) {
            const m = memberSnap.data()
            const amount = toMoney(tx.amount)
            const totalPaid = Math.max(0, Math.round((toMoney(m.paymentAmount) - amount) * 100) / 100)
            const outstanding = Math.round((Math.max(0, toMoney(m.outstandingAmount)) + amount) * 100) / 100
            t.update(memberRef, { paymentAmount: totalPaid, outstandingAmount: outstanding, payment_status: totalPaid > 0 ? 'Partial' : 'Unpaid' })
        }
        t.update(txRef, { status: 'REFUNDED', refunded_at: new Date().toISOString(), refundReason: reason })
        return { alreadyProcessed: false }
    })
}
