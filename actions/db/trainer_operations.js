'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { authorize, getTrainerForSession, getGymContext, getGymScopedDoc, isMemberAssignedToTrainer, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { shapeMemberForTrainer } from '@/lib/server/members'
import { normalizeSchedule } from '@/lib/domain/schedule'
import { notify } from '@/lib/server/notify'

/** Resolves the trainer and, when a member id is given, proves the assignment. */
async function trainerContext(memberId) {
    const session = await authorize('trainer')
    if (!session) return { fail: UNAUTHORIZED }
    if (!adminDb) return { fail: NO_DB }
    const trainer = await getTrainerForSession()
    if (!trainer) return { fail: { error: 'Trainer profile not found.' } }
    if (memberId === undefined) return { session, trainer }
    const member = await getGymScopedDoc('members', memberId, session.gymId)
    if (!member || !isMemberAssignedToTrainer(member.data(), trainer.id, session.uid)) return { fail: { error: 'This member is not assigned to you.' } }
    return { session, trainer, member }
}

/** Members assigned to the signed-in trainer (no financial data). */
export async function getAssignedMembers() {
    const { session, trainer, fail } = await trainerContext()
    if (fail) return []
    const { tz } = await getGymContext(session.gymId)
    const now = new Date()
    const snap = await adminDb.collection('members').where('gymId', '==', session.gymId).get()
    const mine = snap.docs.filter(d => isMemberAssignedToTrainer(d.data(), trainer.id, session.uid))

    // Who is in the gym right now (only for the trainer's own members).
    const openSnap = await adminDb.collection('attendance').where('gymId', '==', session.gymId).where('check_out_time', '==', null).get()
    const inside = new Set(openSnap.docs.map(d => d.data().member_id))

    return plain(mine.map(d => ({ ...shapeMemberForTrainer(d.id, d.data(), now, tz), checkedIn: inside.has(d.id) }))
        .sort((a, b) => a.name.localeCompare(b.name)))
}

export async function acceptMember(memberId) {
    const { member, fail } = await trainerContext(memberId)
    if (fail) return fail
    await member.ref.update({ trainer_status: 'Active' })
    revalidatePath('/trainer/members')
    return { success: true }
}

/** Declining hands the member back to the owner as unassigned; the member is not deleted. */
export async function rejectMember(memberId) {
    const { session, trainer, member, fail } = await trainerContext(memberId)
    if (fail) return fail
    await member.ref.update({ trainer_id: null, trainer_name: 'Unassigned', trainer_status: null })
    await notify({ gymId: session.gymId, targetRole: 'owner', title: 'Trainer declined a member', message: `${trainer.data.name || 'A trainer'} declined ${member.data().name || 'a member'}. The member is now unassigned.`, url: '/members' })
    revalidatePath('/trainer/members')
    return { success: true }
}

export async function addNote(memberId, text, tag) {
    const { session, member, fail } = await trainerContext(memberId)
    if (fail) return fail
    const clean = String(text || '').trim().slice(0, 1000)
    if (!clean) return { error: 'Write a note first.' }
    const { FieldValue } = await import('firebase-admin/firestore')
    const note = { id: `n${Date.now()}`, ts: new Date().toISOString().slice(0, 10), text: clean, tag: String(tag || 'General').slice(0, 30), by: session.uid }
    await member.ref.update({ trainer_notes: FieldValue.arrayUnion(note) })
    revalidatePath('/trainer/members')
    return plain({ success: true, ...note })
}

export async function updateProgress(memberId, progressData = {}) {
    const { session, member, fail } = await trainerContext(memberId)
    if (fail) return fail
    const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 && n < 2000 ? Math.round(n * 10) / 10 : null }
    const entry = {
        id: `p${Date.now()}`, date: new Date().toISOString().slice(0, 10), by: session.uid,
        weight: num(progressData.weight), bench: num(progressData.bench), squat: num(progressData.squat), deadlift: num(progressData.deadlift),
        note: String(progressData.note || '').slice(0, 300),
    }
    if ([entry.weight, entry.bench, entry.squat, entry.deadlift].every(v => v === null)) return { error: 'Enter at least one measurement.' }
    const { FieldValue } = await import('firebase-admin/firestore')
    await member.ref.update({ progress_history: FieldValue.arrayUnion(entry) })
    revalidatePath('/trainer/progress')
    return plain({ success: true, entry })
}

/**
 * Trainer sets the member's weekly workout schedule. This writes the same
 * canonical `schedule` field the member portal, QR check-in and owner portal
 * read, so all three stay in sync.
 */
export async function updateWorkoutPlan(memberId, planData = {}) {
    const { session, trainer, member, fail } = await trainerContext(memberId)
    if (fail) return fail
    if (!planData || typeof planData !== 'object') return { error: 'Invalid plan.' }
    const schedule = normalizeSchedule(planData)
    const hasAny = Object.values(schedule).some(list => list.length > 0)
    await member.ref.update(hasAny
        ? { schedule, noFixedSchedule: false, scheduleUpdatedBy: session.uid, scheduleUpdatedAt: new Date().toISOString() }
        : { schedule: null, noFixedSchedule: true, scheduleUpdatedBy: session.uid, scheduleUpdatedAt: new Date().toISOString() })
    await notify({ gymId: session.gymId, targetRole: 'member', targetMemberId: member.id, title: 'Workout schedule updated', message: `${trainer.data.name || 'Your trainer'} updated your weekly schedule.`, url: '/portal/schedule' })
    revalidatePath('/trainer/plans'); revalidatePath('/trainer/members'); revalidatePath('/portal/schedule')
    return plain({ success: true, schedule })
}
