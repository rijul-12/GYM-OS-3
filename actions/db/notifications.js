'use server'

import { adminDb } from '@/lib/firebase/server'
import { getSession, getMemberForSession, plain } from '@/lib/server/session'

const LIMIT = 30

async function queryRecent(field, value) {
    const base = adminDb.collection('notifications').where(field, '==', value)
    try {
        const snap = await base.orderBy('createdAt', 'desc').limit(150).get()
        return snap.docs
    } catch (e) {
        // Composite index not deployed yet: degrade to an unordered read.
        console.warn(`notifications: missing index for ${field}+createdAt (${e.code || e.message}). Deploy firestore.indexes.json.`)
        const snap = await base.limit(300).get()
        return snap.docs
    }
}

/** Is this notification addressed to the caller? Enforces role and gym isolation. */
function isVisible(n, session, memberId) {
    if (session.role === 'super_admin') return n.targetRole === 'super_admin'
    if (n.gymId !== session.gymId) return false
    const personal = n.targetUid || n.targetMemberId || n.targetEmail
    if (personal) {
        if (n.targetUid) return n.targetUid === session.uid
        if (n.targetMemberId) return session.role === 'member' && n.targetMemberId === memberId
        return n.targetRole === session.role && n.targetEmail === session.email
    }
    return n.targetRole === session.role || n.targetRole === 'all'
}

async function loadVisible(session) {
    let memberId = null
    if (session.role === 'member') memberId = (await getMemberForSession())?.id || null
    const docs = session.role === 'super_admin'
        ? await queryRecent('targetRole', 'super_admin')
        : await queryRecent('gymId', session.gymId)
    return docs
        .map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
        .filter(n => isVisible(n, session, memberId))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

const isRead = (n, uid) => n.read === true || (Array.isArray(n.readBy) && n.readBy.includes(uid))

export async function getNotifications() {
    const session = await getSession()
    if (!session) return { error: 'Not logged in', items: [] }
    if (!adminDb) return { success: true, items: [], unreadCount: 0 }
    try {
        const all = await loadVisible(session)
        const items = all.slice(0, LIMIT).map(n => ({
            id: n.id, title: n.title, message: n.message, url: n.url || null,
            createdAt: n.createdAt || null, read: isRead(n, session.uid),
        }))
        const unreadCount = all.filter(n => !isRead(n, session.uid)).length
        return plain({ success: true, items, unreadCount })
    } catch (e) {
        return { error: 'Could not load notifications', items: [] }
    }
}

export async function markAsRead(notificationId) {
    const session = await getSession()
    if (!session) return { error: 'Not logged in' }
    if (!adminDb || typeof notificationId !== 'string' || !notificationId || notificationId.includes('/')) return { success: false }
    try {
        const { FieldValue } = await import('firebase-admin/firestore')
        const ref = adminDb.collection('notifications').doc(notificationId)
        const snap = await ref.get()
        if (!snap.exists) return { success: false }
        const memberId = session.role === 'member' ? (await getMemberForSession())?.id || null : null
        const n = snap.data()
        if (!isVisible(n, session, memberId)) return { error: 'Not authorised' }
        const personal = n.targetUid || n.targetMemberId || n.targetEmail
        await ref.update({ readBy: FieldValue.arrayUnion(session.uid), ...(personal ? { read: true } : {}) })
        return { success: true }
    } catch (e) {
        return { error: 'Could not update notification' }
    }
}

export async function markAllAsRead() {
    const session = await getSession()
    if (!session) return { error: 'Not logged in' }
    if (!adminDb) return { success: false }
    try {
        const { FieldValue } = await import('firebase-admin/firestore')
        const unread = (await loadVisible(session)).filter(n => !isRead(n, session.uid))
        for (let i = 0; i < unread.length; i += 400) {
            const batch = adminDb.batch()
            unread.slice(i, i + 400).forEach(n => {
                const personal = n.targetUid || n.targetMemberId || n.targetEmail
                batch.update(n.ref, { readBy: FieldValue.arrayUnion(session.uid), ...(personal ? { read: true } : {}) })
            })
            await batch.commit()
        }
        return { success: true, updated: unread.length }
    } catch (e) {
        return { error: 'Could not update notifications' }
    }
}
