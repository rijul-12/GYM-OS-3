// -----------------------------------------------------------------------
// User / gym footprint deletion (server only).
//
// Canonical identity is the Firebase Auth UID. All operations are idempotent:
// running them again after a partial failure finishes the job.
//
// RETENTION POLICY (records that are deliberately NOT erased):
//   member_transactions  member → gym payment ledger. Kept for the gym's
//                        accounting; personal fields are anonymised.
//   transactions,        gym → BGM payments and order logs. Kept as BGM's own
//   payment_logs         financial records.
//   gym_subscriptions    kept (status "Cancelled") as the billing history.
//   audit_logs           kept; they record that the deletion happened.
//   Razorpay             transactions held by Razorpay are outside this system
//                        and are retained by Razorpay under its own policy.
// -----------------------------------------------------------------------
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase/server'

const PAGE = 300

/** Deletes every document matching a query, in pages. Returns the number deleted. */
async function deleteByQuery(query) {
    let total = 0
    for (;;) {
        const snap = await query.limit(PAGE).get()
        if (snap.empty) break
        const batch = adminDb.batch()
        snap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
        total += snap.size
        if (snap.size < PAGE) break
    }
    return total
}

/** Applies an update to every document matching a query, in pages. */
async function updateByQuery(query, patch, marker) {
    let total = 0
    let last = null
    for (;;) {
        let q = query.orderBy('__name__').limit(PAGE)
        if (last) q = q.startAfter(last)
        const snap = await q.get()
        if (snap.empty) break
        const batch = adminDb.batch()
        snap.docs.forEach(d => { if (!marker || d.data()[marker] !== true) batch.update(d.ref, patch) })
        await batch.commit()
        total += snap.size
        last = snap.docs[snap.docs.length - 1]
        if (snap.size < PAGE) break
    }
    return total
}

async function deleteStoragePrefix(prefix) {
    if (!adminStorage || !prefix) return
    try { await adminStorage.bucket().deleteFiles({ prefix }) } catch { /* nothing stored / bucket not configured */ }
}

async function deleteAuthUsers(uids) {
    const list = [...new Set(uids.filter(Boolean))]
    let deleted = 0
    for (let i = 0; i < list.length; i += 1000) {
        try {
            const res = await adminAuth.deleteUsers(list.slice(i, i + 1000))
            deleted += res.successCount
        } catch (e) {
            console.error('auth bulk delete failed:', e.code || e.message)
        }
    }
    return deleted
}

async function writeAudit(action, actor, details) {
    try {
        await adminDb.collection('audit_logs').add({
            action, gymId: details.gymId || null,
            actorUid: actor?.uid || 'system', actorRole: actor?.role || 'system',
            details, timestamp: new Date().toISOString(),
        })
    } catch (e) { console.error('audit log failed:', e.message) }
}

/** Deletes one member's footprint without touching the gym. */
export async function deleteMemberFootprint(memberRef, { actor = null, skipAuth = false } = {}) {
    const snap = await memberRef.get()
    const metrics = { member: 0, attendance: 0, notifications: 0, paymentsRetained: 0, authDeleted: false }
    const data = snap.exists ? snap.data() : {}
    const authUid = data.authUid || null
    const memberId = memberRef.id

    metrics.attendance = await deleteByQuery(adminDb.collection('attendance').where('member_id', '==', memberId))
    metrics.notifications = await deleteByQuery(adminDb.collection('notifications').where('targetMemberId', '==', memberId))
    metrics.paymentsRetained = await updateByQuery(
        adminDb.collection('member_transactions').where('memberId', '==', memberId),
        { memberName: '[Deleted member]', memberDeleted: true }, 'memberDeleted')

    if (authUid) {
        await deleteStoragePrefix(`profilePhotos/${authUid}/`)
        await adminDb.collection('user_settings').doc(authUid).delete().catch(() => { })
        await deleteByQuery(adminDb.collection('notifications').where('targetUid', '==', authUid))
    }
    if (snap.exists) { await memberRef.delete(); metrics.member = 1 }
    if (authUid && !skipAuth) {
        try { await adminAuth.deleteUser(authUid); metrics.authDeleted = true } catch (e) {
            if (e.code !== 'auth/user-not-found') console.error('auth delete failed:', e.code)
        }
    }
    await writeAudit('MEMBER_DELETED', actor, { gymId: data.gymId || null, memberId, metrics, retention: 'member_transactions anonymised and retained' })
    return metrics
}

/** Deletes one trainer. Assigned members are unassigned — never deleted. */
export async function deleteTrainerFootprint(trainerRef, { actor = null, skipAuth = false } = {}) {
    const snap = await trainerRef.get()
    const data = snap.exists ? snap.data() : {}
    const trainerId = trainerRef.id
    const authUid = data.uid || null
    const metrics = { trainer: 0, unassignedMembers: 0, authDeleted: false }

    const ids = [...new Set([trainerId, authUid].filter(Boolean))]
    for (const id of ids) {
        metrics.unassignedMembers += await updateByQuery(
            adminDb.collection('members').where('trainer_id', '==', id),
            { trainer_id: null, trainer_name: 'Unassigned', trainer_status: null })
    }
    // Documents keyed by the Auth UID are their own account.
    const uid = authUid || (await authUserExists(trainerId) ? trainerId : null)
    if (uid) {
        await deleteStoragePrefix(`profilePhotos/${uid}/`)
        await adminDb.collection('user_settings').doc(uid).delete().catch(() => { })
        await deleteByQuery(adminDb.collection('notifications').where('targetUid', '==', uid))
    }
    if (snap.exists) { await trainerRef.delete(); metrics.trainer = 1 }
    if (uid && !skipAuth) {
        try { await adminAuth.deleteUser(uid); metrics.authDeleted = true } catch (e) {
            if (e.code !== 'auth/user-not-found') console.error('auth delete failed:', e.code)
        }
    }
    await writeAudit('TRAINER_DELETED', actor, { gymId: data.gymId || null, trainerId, metrics })
    return metrics
}

async function authUserExists(uid) {
    try { await adminAuth.getUser(uid); return true } catch { return false }
}

/** Deletes a gym and all of its dependent operational records. */
export async function deleteGymFootprint(gymId, { actor = null } = {}) {
    if (!gymId || typeof gymId !== 'string') throw new Error('A gym id is required.')
    const gymRef = adminDb.collection('gyms').doc(gymId)
    const gymSnap = await gymRef.get()
    const gym = gymSnap.exists ? gymSnap.data() : {}
    const metrics = { members: 0, trainers: 0, attendance: 0, plans: 0, notifications: 0, authUsers: 0, paymentsRetained: 0 }

    // Collect every Auth account that belongs to this gym before the documents disappear.
    const uids = new Set()
    if (gym.ownerUid) uids.add(gym.ownerUid)
    const [membersSnap, trainersSnap] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', gymId).select('authUid').get(),
        adminDb.collection('trainers').where('gymId', '==', gymId).select('uid').get(),
    ])
    membersSnap.docs.forEach(d => { if (d.data().authUid) uids.add(d.data().authUid) })
    for (const d of trainersSnap.docs) {
        if (d.data().uid) uids.add(d.data().uid)
        else if (await authUserExists(d.id)) uids.add(d.id)
    }
    for (const d of membersSnap.docs) if (!d.data().authUid && await authUserExists(d.id)) uids.add(d.id)

    metrics.paymentsRetained = await updateByQuery(
        adminDb.collection('member_transactions').where('gymId', '==', gymId),
        { memberName: '[Deleted gym]', gymDeleted: true }, 'gymDeleted')

    metrics.attendance = await deleteByQuery(adminDb.collection('attendance').where('gymId', '==', gymId))
    metrics.members = await deleteByQuery(adminDb.collection('members').where('gymId', '==', gymId))
    metrics.trainers = await deleteByQuery(adminDb.collection('trainers').where('gymId', '==', gymId))
    metrics.plans = await deleteByQuery(adminDb.collection('plans').where('gymId', '==', gymId))
    metrics.notifications = await deleteByQuery(adminDb.collection('notifications').where('gymId', '==', gymId))
    await deleteByQuery(adminDb.collection('sms_logs').where('gymId', '==', gymId))
    await deleteByQuery(adminDb.collection('import_batches').where('gymId', '==', gymId))
    await deleteByQuery(adminDb.collection('subscription_requests').where('gymId', '==', gymId))
    await deleteByQuery(adminDb.collection('gym_activity_logs').where('gymCode', '==', gymId))
    await deleteByQuery(adminDb.collection('gym_feedback').where('gymCode', '==', gymId))

    for (const uid of uids) {
        await deleteStoragePrefix(`profilePhotos/${uid}/`)
        await adminDb.collection('user_settings').doc(uid).delete().catch(() => { })
        await adminDb.collection('users').doc(uid).delete().catch(() => { })
    }
    await deleteStoragePrefix(`gyms/${gymId}/`)
    await adminDb.collection('users').doc(`owner_${gymId}`).delete().catch(() => { })

    const batch = adminDb.batch()
    batch.delete(adminDb.collection('gym_settings').doc(gymId))
    batch.delete(adminDb.collection('gym_api_settings').doc(gymId))
    batch.delete(gymRef)
    await batch.commit()

    const subRef = adminDb.collection('gym_subscriptions').doc(gymId)
    if ((await subRef.get()).exists) await subRef.set({ status: 'Cancelled', cancelledAt: new Date().toISOString(), gymDeleted: true }, { merge: true })

    metrics.authUsers = await deleteAuthUsers([...uids])
    await writeAudit('GYM_DELETED', actor, { gymId, metrics, retention: 'member_transactions (anonymised), transactions, payment_logs, gym_subscriptions and audit_logs retained' })
    return { success: true, metrics }
}

/**
 * Entry point keyed by Firebase UID. Works both before the Auth user is
 * deleted (role read from custom claims) and after (role inferred from the
 * documents that reference the UID), so it can be driven by an Auth
 * onDelete trigger.
 */
export async function deleteUserFootprint(uid, { actor = null } = {}) {
    if (!uid || typeof uid !== 'string' || uid.includes('/')) throw new Error('A valid UID is required.')
    const roles = []
    const metrics = {}

    let claims = null
    try { claims = (await adminAuth.getUser(uid)).customClaims || null } catch { claims = null }
    if (claims?.role === 'super_admin') {
        await writeAudit('SUPER_ADMIN_DELETE_BLOCKED', actor, { uid })
        return { success: false, error: 'Super Admin accounts cannot be deleted through this path.' }
    }
    const userDoc = await adminDb.collection('users').doc(uid).get()
    if (userDoc.exists && ['super_admin', 'superadmin'].includes(userDoc.data().role)) {
        await writeAudit('SUPER_ADMIN_DELETE_BLOCKED', actor, { uid })
        return { success: false, error: 'Super Admin accounts cannot be deleted through this path.' }
    }

    // Owner → the gym they own.
    const owned = await adminDb.collection('gyms').where('ownerUid', '==', uid).get()
    for (const g of owned.docs) {
        roles.push('owner')
        metrics[`gym:${g.id}`] = (await deleteGymFootprint(g.id, { actor })).metrics
    }

    // Member
    const memberRefs = new Map()
    const direct = await adminDb.collection('members').doc(uid).get()
    if (direct.exists) memberRefs.set(direct.id, direct.ref)
    const byUid = await adminDb.collection('members').where('authUid', '==', uid).get()
    byUid.docs.forEach(d => memberRefs.set(d.id, d.ref))
    for (const ref of memberRefs.values()) {
        roles.push('member')
        metrics[`member:${ref.id}`] = await deleteMemberFootprint(ref, { actor, skipAuth: true })
    }

    // Trainer
    const trainerRefs = new Map()
    const tDirect = await adminDb.collection('trainers').doc(uid).get()
    if (tDirect.exists) trainerRefs.set(tDirect.id, tDirect.ref)
    const tByUid = await adminDb.collection('trainers').where('uid', '==', uid).get()
    tByUid.docs.forEach(d => trainerRefs.set(d.id, d.ref))
    for (const ref of trainerRefs.values()) {
        roles.push('trainer')
        metrics[`trainer:${ref.id}`] = await deleteTrainerFootprint(ref, { actor, skipAuth: true })
    }

    await deleteStoragePrefix(`profilePhotos/${uid}/`)
    await adminDb.collection('user_settings').doc(uid).delete().catch(() => { })
    await adminDb.collection('users').doc(uid).delete().catch(() => { })
    await deleteByQuery(adminDb.collection('notifications').where('targetUid', '==', uid))
    try { await adminAuth.deleteUser(uid) } catch (e) {
        if (e.code !== 'auth/user-not-found') console.error('auth delete failed:', e.code)
    }

    await writeAudit('USER_FOOTPRINT_DELETED', actor, { uid, roles, metrics })
    return { success: true, roles, metrics }
}
