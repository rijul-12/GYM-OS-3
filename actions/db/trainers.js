'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, getTrainerForSession, getGymContext, getGymScopedDoc, gymDisplayName, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { assertGymWritable } from '@/lib/server/subscription'
import { newInviteToken } from '@/lib/server/members'
import { normalizeEmail, normalizePhone, isValidEmail } from '@/lib/domain/phone'
import { toMoney } from '@/lib/domain/membership'
import { notify } from '@/lib/server/notify'

const clip = (v, n) => String(v ?? '').trim().slice(0, n)

function shapeTrainer(id, d, assignedCount = 0, { includePrivate = false } = {}) {
    const base = {
        id,
        gymId: d.gymId,
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        photoURL: d.photoURL || d.photo || null,
        specialization: d.specialization || d.specialty || '',
        experience: d.experience || '',
        bio: d.bio || '',
        workingDays: Array.isArray(d.workingDays) ? d.workingDays : [],
        preferredTiming: d.preferredTiming || d.schedule || '',
        status: d.status || 'Pending',
        hasAccount: !!d.uid || d.selfRegistered === true,
        invitePending: !!d.inviteTokenHash && !d.uid,
        members: assignedCount,
        created_at: d.created_at || d.createdAt || null,
    }
    if (includePrivate) base.salary = toMoney(d.salary)
    return base
}

async function assignedCounts(gymId) {
    const snap = await adminDb.collection('members').where('gymId', '==', gymId).select('trainer_id').get()
    const counts = {}
    snap.docs.forEach(d => { const t = d.data().trainer_id; if (t) counts[t] = (counts[t] || 0) + 1 })
    return counts
}

/** Owner: all trainers of the gym with their real assigned-member counts. */
export async function getTrainers() {
    const session = await authorize('owner')
    if (!session || !adminDb) return []
    const [snap, counts] = await Promise.all([
        adminDb.collection('trainers').where('gymId', '==', session.gymId).get(),
        assignedCounts(session.gymId),
    ])
    return plain(snap.docs.map(d => shapeTrainer(d.id, d.data(), (counts[d.id] || 0) + (d.data().uid && d.data().uid !== d.id ? (counts[d.data().uid] || 0) : 0), { includePrivate: true }))
        .sort((a, b) => a.name.localeCompare(b.name)))
}

/**
 * Owner: invite a trainer. Creates the trainer record in "Invited" state and
 * e-mails a single-use link; the trainer sets their own password when they
 * accept, which links their login to this exact record.
 */
export async function createTrainer(input = {}) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const writable = await assertGymWritable(session.gymId)
    if (!writable.ok) return { error: writable.error }

    const name = clip(input.name, 80)
    const email = normalizeEmail(input.email)
    if (name.length < 2) return { error: 'Trainer name is required.' }
    if (!email || !isValidEmail(email)) return { error: 'A valid e-mail address is required to invite a trainer.' }
    let phone = ''
    if (input.phone) { phone = normalizePhone(input.phone); if (!phone) return { error: 'Phone number is not valid.' } }

    const existing = await adminDb.collection('trainers').where('gymId', '==', session.gymId).where('email', '==', email).limit(1).get()
    if (!existing.empty) return { error: 'A trainer with this e-mail already exists in your gym.' }

    const invite = newInviteToken()
    const payload = {
        gymId: session.gymId, name, email, phone,
        specialization: clip(input.specialization, 80), experience: clip(input.experience, 40),
        salary: toMoney(input.salary), status: 'Invited', uid: null,
        inviteTokenHash: invite.hash, inviteExpiresAt: invite.expiresAt,
        created_at: new Date().toISOString(), createdBy: session.uid,
    }
    const ref = await adminDb.collection('trainers').add(payload)
    await audit(session, 'TRAINER_INVITED', { trainerId: ref.id })

    const { gym } = await getGymContext(session.gymId)
    const { sendTrainerInviteEmail } = await import('@/lib/email')
    const mail = await sendTrainerInviteEmail({ email, name, gymName: gymDisplayName(gym), token: invite.token })

    revalidatePath('/trainers')
    return plain({ success: true, ...shapeTrainer(ref.id, payload, 0, { includePrivate: true }), inviteSent: !!mail.success, inviteError: mail.success ? null : mail.error })
}

/** Owner: issue a fresh invitation link for a trainer who has not accepted yet. */
export async function resendTrainerInvite(trainerId) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('trainers', trainerId, session.gymId)
    if (!snap) return { error: 'Trainer not found.' }
    if (snap.data().uid) return { error: 'This trainer already has an account.' }
    const invite = newInviteToken()
    await snap.ref.update({ inviteTokenHash: invite.hash, inviteExpiresAt: invite.expiresAt, status: 'Invited' })
    const { gym } = await getGymContext(session.gymId)
    const { sendTrainerInviteEmail } = await import('@/lib/email')
    const mail = await sendTrainerInviteEmail({ email: snap.data().email, name: snap.data().name, gymName: gymDisplayName(gym), token: invite.token })
    return mail.success ? { success: true } : { error: mail.error || 'The invitation could not be sent.' }
}

async function setTrainerStatus(trainerId, status, action) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('trainers', trainerId, session.gymId)
    if (!snap) return { error: 'Trainer not found.' }
    // An invited trainer becomes active by accepting the invitation, not by a click here.
    if (status === 'Active' && !snap.data().uid && snap.data().inviteTokenHash) return { error: 'This trainer has not accepted the invitation yet.' }
    await snap.ref.update({ status, is_active: status === 'Active', statusChangedAt: new Date().toISOString() })
    await audit(session, action, { trainerId })
    const uid = snap.data().uid || snap.id
    if (status === 'Active') await notify({ gymId: session.gymId, targetRole: 'trainer', targetUid: uid, title: 'Profile approved', message: 'Your trainer profile has been approved. You can now sign in.', url: '/trainer' })
    revalidatePath('/trainers')
    return { success: true }
}

export async function approveTrainer(trainerId) { return setTrainerStatus(trainerId, 'Active', 'TRAINER_APPROVED') }
export async function suspendTrainer(trainerId) { return setTrainerStatus(trainerId, 'Suspended', 'TRAINER_SUSPENDED') }

/** Owner: remove a trainer. Their members stay in the gym and become unassigned. */
export async function removeTrainer(trainerId) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('trainers', trainerId, session.gymId)
    if (!snap) return { error: 'Trainer not found.' }
    try {
        const { deleteTrainerFootprint } = await import('@/lib/server/deletion')
        const metrics = await deleteTrainerFootprint(snap.ref, { actor: session })
        revalidatePath('/trainers'); revalidatePath('/members')
        return plain({ success: true, ...metrics })
    } catch (e) {
        return { error: 'Could not remove the trainer.' }
    }
}

/** The signed-in trainer's own profile. */
export async function getMyTrainerProfile() {
    const session = await authorize('trainer')
    if (!session || !adminDb) return null
    const trainer = await getTrainerForSession()
    if (!trainer) return null
    const counts = await assignedCounts(session.gymId)
    const { gym } = await getGymContext(session.gymId)
    const profile = shapeTrainer(trainer.id, trainer.data, (counts[trainer.id] || 0) + (session.uid !== trainer.id ? (counts[session.uid] || 0) : 0))
    profile.gymName = gymDisplayName(gym)
    return plain(profile)
}

const TRAINER_SELF_FIELDS = { name: 80, phone: 30, specialization: 80, experience: 40, bio: 600, preferredTiming: 60 }

/**
 * trainer → their own public profile fields
 * owner   → a trainer of their gym (additionally salary)
 */
export async function updateTrainerProfile(trainerId, updateData = {}) {
    const session = await getSession()
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB

    let ref
    if (session.role === 'trainer') {
        const me = await getTrainerForSession()
        if (!me) return { error: 'Trainer profile not found.' }
        ref = me.ref
    } else if (session.role === 'owner') {
        const snap = await getGymScopedDoc('trainers', trainerId, session.gymId)
        if (!snap) return { error: 'Trainer not found.' }
        ref = snap.ref
    } else return UNAUTHORIZED

    const patch = {}
    for (const [key, max] of Object.entries(TRAINER_SELF_FIELDS)) {
        if (!(key in updateData)) continue
        if (key === 'phone') {
            const phone = updateData.phone ? normalizePhone(updateData.phone) : ''
            if (updateData.phone && !phone) return { error: 'Phone number is not valid.' }
            patch.phone = phone
        } else if (key === 'name') {
            const n = clip(updateData.name, max)
            if (n.length < 2) return { error: 'Name is required.' }
            patch.name = n
        } else patch[key] = clip(updateData[key], max)
    }
    if (Array.isArray(updateData.workingDays)) patch.workingDays = updateData.workingDays.filter(d => typeof d === 'string').slice(0, 7).map(d => d.slice(0, 12))
    if (session.role === 'owner' && 'salary' in updateData) patch.salary = toMoney(updateData.salary)
    if (Object.keys(patch).length === 0) return { error: 'Nothing to update.' }

    await ref.update({ ...patch, updatedAt: new Date().toISOString() })
    if (patch.name) {
        // Keep the denormalised trainer name on assigned members in sync.
        const assigned = await adminDb.collection('members').where('trainer_id', '==', ref.id).get()
        for (let i = 0; i < assigned.docs.length; i += 400) {
            const batch = adminDb.batch()
            assigned.docs.slice(i, i + 400).forEach(d => batch.update(d.ref, { trainer_name: patch.name }))
            await batch.commit()
        }
    }
    revalidatePath('/trainer/profile'); revalidatePath('/trainers')
    return { success: true }
}
