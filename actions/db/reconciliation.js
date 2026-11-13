'use server'

import { adminDb, adminAuth } from '@/lib/firebase/server'
import { authorize, UNAUTHORIZED, NO_DB, audit } from '@/lib/server/session'

/** Super Admin: find profile records whose Auth account or gym no longer exists. */
export async function adminScanOrphans() {
    const session = await authorize('super_admin')
    const orphans = { owners: [], members: [], trainers: [] }
    if (!session || !adminDb) return orphans

    const authUids = new Set()
    let pageToken
    do {
        const page = await adminAuth.listUsers(1000, pageToken)
        page.users.forEach(u => authUids.add(u.uid))
        pageToken = page.pageToken
    } while (pageToken)

    const gymsSnap = await adminDb.collection('gyms').get()
    const gymIds = new Set(gymsSnap.docs.map(d => d.id))
    gymsSnap.docs.forEach(d => {
        const g = d.data()
        if (g.ownerUid && !authUids.has(g.ownerUid)) orphans.owners.push({ uid: g.ownerUid, email: g.email || d.id, reason: 'Owner login no longer exists', gymId: d.id })
    })

    const membersSnap = await adminDb.collection('members').get()
    membersSnap.docs.forEach(d => {
        const m = d.data()
        if (m.gymId && !gymIds.has(m.gymId)) orphans.members.push({ uid: d.id, kind: 'member-doc', email: m.email || '', reason: 'Gym no longer exists' })
        else if (m.authUid && !authUids.has(m.authUid)) orphans.members.push({ uid: m.authUid, kind: 'uid', email: m.email || '', reason: 'Login no longer exists' })
    })

    const trainersSnap = await adminDb.collection('trainers').get()
    trainersSnap.docs.forEach(d => {
        const t = d.data()
        if (t.gymId && !gymIds.has(t.gymId)) orphans.trainers.push({ uid: d.id, kind: 'trainer-doc', email: t.email || '', reason: 'Gym no longer exists' })
        else if (t.uid && !authUids.has(t.uid)) orphans.trainers.push({ uid: t.uid, kind: 'uid', email: t.email || '', reason: 'Login no longer exists' })
    })
    return orphans
}

/** Super Admin: clean up one orphan found by the scan. */
export async function executeOrphanCleanupServerAction(uid, kind = 'uid') {
    const session = await authorize('super_admin')
    if (!session) return { success: false, error: UNAUTHORIZED.error }
    if (!adminDb) return { success: false, error: NO_DB.error }
    if (typeof uid !== 'string' || !uid || uid.includes('/')) return { success: false, error: 'Invalid id.' }
    const { deleteUserFootprint, deleteMemberFootprint, deleteTrainerFootprint } = await import('@/lib/server/deletion')
    try {
        if (kind === 'member-doc') await deleteMemberFootprint(adminDb.collection('members').doc(uid), { actor: session })
        else if (kind === 'trainer-doc') await deleteTrainerFootprint(adminDb.collection('trainers').doc(uid), { actor: session })
        else {
            const res = await deleteUserFootprint(uid, { actor: session })
            if (!res.success) return res
        }
        await audit(session, 'ORPHAN_CLEANED', { uid, kind })
        return { success: true }
    } catch (e) {
        return { success: false, error: e.message }
    }
}
