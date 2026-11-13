'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { authorize, getGymScopedDoc, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { applyMemberPayment } from '@/lib/server/payments'
import { toMoney, getOutstanding } from '@/lib/domain/membership'
import { notify } from '@/lib/server/notify'

const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']

/** Owner: the gym's member payment ledger (newest first). */
export async function getMemberTransactions() {
    const session = await authorize('owner')
    if (!session || !adminDb) return []
    const snap = await adminDb.collection('member_transactions').where('gymId', '==', session.gymId).get()
    const rows = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(tx => tx.status !== 'CREATED') // abandoned checkout attempts are not payments
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 500)
    return plain(rows.map(tx => ({
        id: tx.id, memberId: tx.memberId, memberName: tx.memberName || 'Member', amount: toMoney(tx.amount),
        method: tx.method || 'Other', status: tx.status, utr: tx.utr || null, note: tx.note || null,
        created_at: tx.created_at || null, resolved_at: tx.resolved_at || null,
    })))
}

/** Owner: UPI claims waiting for confirmation. */
export async function getPendingMemberTransactions() {
    const all = await getMemberTransactions()
    return all.filter(tx => tx.status === 'PENDING_VERIFICATION')
}

/**
 * Owner confirms or rejects a member's UPI claim.
 * Only the owner of the gym the payment belongs to can do this; members can
 * never mark their own payment as PAID.
 */
export async function resolveUpiPayment(txId, actionStatus) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!['PAID', 'REJECTED'].includes(actionStatus)) return { error: 'Invalid action.' }

    const txSnap = await getGymScopedDoc('member_transactions', txId, session.gymId)
    if (!txSnap) return { error: 'Transaction not found.' }
    const data = txSnap.data()
    if (data.status !== 'PENDING_VERIFICATION') return { error: 'This payment was already resolved.' }

    try {
        if (actionStatus === 'REJECTED') {
            const done = await adminDb.runTransaction(async (t) => {
                const fresh = await t.get(txSnap.ref)
                if (fresh.data().status !== 'PENDING_VERIFICATION') return false
                t.update(txSnap.ref, { status: 'REJECTED', resolved_at: new Date().toISOString(), resolvedBy: session.uid })
                return true
            })
            if (!done) return { error: 'This payment was already resolved.' }
            await notify({ gymId: session.gymId, targetRole: 'member', targetMemberId: data.memberId, title: 'Payment not verified', message: `Your gym could not verify your UPI payment of ₹${data.amount}. Please contact the front desk.`, url: '/portal/billing' })
        } else {
            const res = await applyMemberPayment({ txRef: txSnap.ref, gymId: session.gymId, memberId: data.memberId, amount: data.amount, method: 'UPI', extra: { resolvedBy: session.uid } })
            if (res.alreadyProcessed) return { error: 'This payment was already resolved.' }
            await notify({ gymId: session.gymId, targetRole: 'member', targetMemberId: data.memberId, title: 'Payment confirmed', message: `Your payment of ₹${data.amount} was confirmed by your gym.`, url: '/portal/billing' })
        }
        await audit(session, 'MEMBER_UPI_PAYMENT_' + actionStatus, { txId, memberId: data.memberId, amount: data.amount })
        revalidatePath('/dashboard/payments')
        revalidatePath('/members')
        return { success: true }
    } catch (e) {
        return { error: 'Could not update the payment. Please try again.' }
    }
}

/** Owner records a payment collected at the front desk (cash, card, bank…). */
export async function recordMemberPayment(memberId, { amount, method = 'Cash', note = '' } = {}) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB

    const memberSnap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!memberSnap) return { error: 'Member not found.' }
    const paid = toMoney(amount)
    if (!(paid > 0)) return { error: 'Enter an amount greater than zero.' }
    if (paid > 10000000) return { error: 'Amount is too large.' }
    const outstanding = getOutstanding(memberSnap.data())
    if (paid > outstanding && outstanding > 0) return { error: `Amount exceeds the outstanding balance of ₹${outstanding}.` }
    if (outstanding === 0) return { error: 'This member has no outstanding balance. Renew the membership to add a new charge.' }
    const safeMethod = METHODS.includes(method) ? method : 'Other'

    const txRef = adminDb.collection('member_transactions').doc()
    try {
        const res = await applyMemberPayment({ txRef, gymId: session.gymId, memberId, amount: paid, method: safeMethod, extra: { recordedBy: session.uid, note: String(note || '').slice(0, 200) || null } })
        await audit(session, 'MEMBER_PAYMENT_RECORDED', { memberId, amount: paid, method: safeMethod })
        revalidatePath('/members')
        revalidatePath('/dashboard/payments')
        return { success: true, outstanding: res.newOutstanding }
    } catch (e) {
        return { error: 'Could not record the payment.' }
    }
}
