'use server'

import { isFirebaseConfigured } from '@/lib/firebase/server'
import { revalidatePath } from 'next/cache'

export async function getPendingMemberTransactions(gymId) {
    if (!isFirebaseConfigured()) return []
    const { adminDb } = await import('@/lib/firebase/server')
    const snap = await adminDb.collection('member_transactions')
        .where('gymId', '==', gymId)
        .where('status', '==', 'PENDING_VERIFICATION')
        .get()

    // We also need Member Names cleanly, let's fetch members batch
    const memberIds = [...new Set(snap.docs.map(d => d.data().memberId))]
    let membersDict = {}
    if (memberIds.length > 0) {
        // Due to firestore IN limits (max 10), we'll parallel fetch each or just fetch all
        const mSnap = await Promise.all(memberIds.map(id => adminDb.collection('members').doc(id).get()))
        mSnap.forEach(d => {
            if (d.exists) membersDict[d.id] = d.data().name || 'Unknown Member'
        })
    }

    return snap.docs.map(d => {
        const data = d.data()
        return {
            id: d.id,
            ...data,
            memberName: membersDict[data.memberId] || 'Unknown Member'
        }
    })
}

export async function resolveUpiPayment(txId, actionStatus) {
    if (!isFirebaseConfigured()) return { error: 'No DB' }
    const { adminDb } = await import('@/lib/firebase/server')

    try {
        const txRef = adminDb.collection('member_transactions').doc(txId)
        const txDoc = await txRef.get()
        if (!txDoc.exists) return { error: 'Transaction missing' }

        const data = txDoc.data()
        if (data.status !== 'PENDING_VERIFICATION') return { error: 'Already resolved' }

        const batch = adminDb.batch()

        if (actionStatus === 'REJECTED') {
            batch.update(txRef, { status: 'REJECTED', resolved_at: new Date().toISOString() })
            await batch.commit()
            return { success: true }
        }

        if (actionStatus === 'PAID') {
            batch.update(txRef, { status: 'PAID', resolved_at: new Date().toISOString() })

            // Log global Revenue metric
            const revRef = adminDb.collection('revenue').doc()
            batch.set(revRef, {
                userId: data.memberId,
                gymId: data.gymId,
                userName: 'Paid Member', // Will be populated globally via joins mostly
                amount: data.amount,
                outstanding: 0,
                planName: 'Manual UPI Dues',
                date: new Date().toISOString(),
                status: 'PAID',
                type: 'Subscription',
                method: 'UPI',
                is_recurring: false
            })

            // Clear outstanding amounts securely
            const memRef = adminDb.collection('members').doc(data.memberId)
            batch.update(memRef, { outstandingAmount: 0 })

            await batch.commit()
            return { success: true }
        }

    } catch (e) {
        return { error: 'Failed' }
    }
}
