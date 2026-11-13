'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, getMemberForSession, getTrainerForSession, getGymContext, isMemberAssignedToTrainer, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { maxSessionMinutes, queryAttendanceSince, sinceDaysAgo } from '@/lib/server/live'
import { getEffectiveStatus, MEMBER_STATUS } from '@/lib/domain/membership'
import { getPlannedWorkout, getMemberSchedule, normalizeDayEntry, MUSCLE_GROUPS } from '@/lib/domain/schedule'
import { isOpenSession, isStaleSession, sessionCheckIn, sessionCheckOut, sessionDurationMinutes, sanitizeZones } from '@/lib/domain/occupancy'
import { weekdayInTz } from '@/lib/domain/dates'
import { notify } from '@/lib/server/notify'

const INVALID_QR = 'This QR code is no longer valid. Please ask your gym for the current one.'

function shapeLog(id, d) {
    return {
        id,
        member_id: d.member_id || d.memberId || null,
        gymId: d.gymId,
        check_in_time: sessionCheckIn(d),
        check_out_time: sessionCheckOut(d),
        status: d.status || (sessionCheckOut(d) ? 'Completed' : 'Active'),
        method: d.method || null,
        method_out: d.method_out || null,
        actual_workout: normalizeDayEntry(d.actual_workout),
        planned_workout: normalizeDayEntry(d.planned_workout),
        duration_minutes: sessionDurationMinutes(d),
        members: { name: d.member_name || d.members?.name || 'Member', photo_url: d.member_photo || d.members?.photo_url || null },
    }
}

/**
 * Attendance history.
 *   owner   → the whole gym
 *   trainer → only members assigned to them
 *   member  → only their own sessions
 */
export async function getAttendanceLogs(limit = 50) {
    const session = await getSession()
    if (!session || !adminDb || session.role === 'super_admin') return []
    const max = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500)

    if (session.role === 'member') {
        const member = await getMemberForSession()
        if (!member) return []
        const snap = await adminDb.collection('attendance').where('member_id', '==', member.id).get()
        return plain(snap.docs.filter(d => d.data().gymId === session.gymId).map(d => shapeLog(d.id, d.data()))
            .sort((a, b) => String(b.check_in_time).localeCompare(String(a.check_in_time))).slice(0, max))
    }

    let logs = (await queryAttendanceSince(session.gymId, sinceDaysAgo(60))).map(d => shapeLog(d.id, d))
    if (session.role === 'trainer') {
        const trainer = await getTrainerForSession()
        if (!trainer) return []
        const mSnap = await adminDb.collection('members').where('gymId', '==', session.gymId).get()
        const mine = new Set(mSnap.docs.filter(d => isMemberAssignedToTrainer(d.data(), trainer.id, session.uid)).map(d => d.id))
        logs = logs.filter(l => mine.has(l.member_id))
    }
    return plain(logs.sort((a, b) => String(b.check_in_time).localeCompare(String(a.check_in_time))).slice(0, max))
}

/** Resolves a scanned QR code to a gym. Only the gym's CURRENT code is accepted. */
async function resolveGymByCode(gymCode) {
    const code = String(gymCode || '').trim().toUpperCase()
    if (!code || code.length > 40) return null
    const q = await adminDb.collection('gyms').where('gymCode', '==', code).limit(1).get()
    if (q.empty) return null
    return { id: q.docs[0].id, data: q.docs[0].data() }
}

/** Everything that must be true before a member may check in. */
async function validateCheckin(gymCode) {
    const session = await getSession()
    if (!session) return { error: 'Please sign in to check in.', requireLogin: true }
    if (session.role !== 'member') return { error: 'Only members can check in with the gym QR code.' }
    if (!adminDb) return NO_DB

    const gym = await resolveGymByCode(gymCode)
    if (!gym) return { error: INVALID_QR }
    if (gym.id !== session.gymId) return { error: 'This QR code belongs to a different gym.' }
    if (String(gym.data.status || 'Active').toLowerCase() !== 'active') return { error: 'This gym is not currently active.' }

    const member = await getMemberForSession()
    if (!member) return { error: 'Your member profile could not be found. Please contact your gym.' }

    const { settings, tz } = await getGymContext(gym.id)
    const status = getEffectiveStatus(member.data, new Date(), tz)
    if (status !== MEMBER_STATUS.ACTIVE) {
        const reasons = {
            [MEMBER_STATUS.EXPIRED]: 'Your membership has expired. Please renew at the front desk.',
            [MEMBER_STATUS.PENDING]: 'Your membership is waiting for approval by the gym.',
            [MEMBER_STATUS.SUSPENDED]: 'Your membership is suspended. Please contact your gym.',
            [MEMBER_STATUS.CANCELLED]: 'Your membership has been cancelled.',
        }
        return { error: reasons[status] || 'Your membership is not active.' }
    }
    return { session, gym, member, settings, tz }
}

export async function getAttendancePreCheck(gymCode) {
    const ctx = await validateCheckin(gymCode)
    if (ctx.error) return ctx
    const { gym, member, settings, tz } = ctx
    const maxMinutes = maxSessionMinutes(settings)
    const now = new Date()

    const openSnap = await adminDb.collection('attendance').where('member_id', '==', member.id).where('check_out_time', '==', null).get()
    const live = openSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => isOpenSession(s) && !isStaleSession(s, now, maxMinutes))
    if (live.length > 0) {
        return { success: true, message: 'Already checked in', gymId: gym.id, checkInTime: sessionCheckIn(live[0]) }
    }

    const { noFixedSchedule } = getMemberSchedule(member.data)
    const plannedWorkout = getPlannedWorkout(member.data, weekdayInTz(now, tz))
    const zoneGroups = sanitizeZones(settings.widgets).map(z => z.muscleGroup)
    const options = [...new Set([...MUSCLE_GROUPS, ...zoneGroups])]

    return { success: true, gymId: gym.id, memberId: member.id, plannedWorkout, noFixedSchedule, options }
}

export async function markQrAttendance(gymCode, actualWorkout = []) {
    const ctx = await validateCheckin(gymCode)
    if (ctx.error) return ctx
    const { gym, member, settings, tz } = ctx
    const maxMinutes = maxSessionMinutes(settings)
    const actual = normalizeDayEntry(Array.isArray(actualWorkout) ? actualWorkout : [])
    const planned = getPlannedWorkout(member.data, weekdayInTz(new Date(), tz))

    try {
        // The member document is read and written inside the transaction, so two
        // simultaneous requests (double tap, retry on a bad network) serialise and
        // the second one sees the session created by the first.
        const result = await adminDb.runTransaction(async (t) => {
            const now = new Date()
            const memberSnap = await t.get(member.ref)
            const openSnap = await t.get(adminDb.collection('attendance').where('member_id', '==', member.id).where('check_out_time', '==', null))
            const open = openSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })).filter(isOpenSession)

            const live = open.filter(s => !isStaleSession(s, now, maxMinutes))
            if (live.length > 0) return { duplicate: true, id: live[0].id, checkInTime: sessionCheckIn(live[0]) }

            open.forEach(s => t.update(s.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Auto' }))

            const ref = adminDb.collection('attendance').doc()
            const m = memberSnap.data() || {}
            t.set(ref, {
                member_id: member.id,
                member_name: m.name || 'Member',
                member_photo: m.photoURL || m.photo_url || null,
                gymId: gym.id,
                check_in_time: now.toISOString(),
                check_out_time: null,
                method: 'QR',
                status: 'Active',
                actual_workout: actual,
                planned_workout: planned,
            })
            t.update(member.ref, { activeSessionId: ref.id, lastCheckInAt: now.toISOString() })
            return { duplicate: false, id: ref.id, checkInTime: now.toISOString() }
        })

        revalidatePath('/dashboard')
        revalidatePath('/occupancy')
        revalidatePath('/portal')
        return { success: true, gymId: gym.id, actualWorkout: actual, alreadyCheckedIn: result.duplicate, checkInTime: result.checkInTime }
    } catch (err) {
        console.error('check-in failed:', err.message)
        return { error: 'We could not record your check-in. Please check your connection and try again.' }
    }
}

/** The signed-in member's current session, if any. */
export async function getActiveCheckoutContext() {
    const session = await authorize('member')
    if (!session) return { error: 'Please sign in.', requireLogin: true }
    if (!adminDb) return NO_DB
    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }

    const { settings } = await getGymContext(session.gymId)
    const now = new Date()
    const openSnap = await adminDb.collection('attendance').where('member_id', '==', member.id).where('check_out_time', '==', null).get()
    const live = openSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => isOpenSession(s) && !isStaleSession(s, now, maxSessionMinutes(settings)))
    if (live.length === 0) return { error: 'You do not have an active session.' }
    const s = live[0]
    return { context: { id: s.id, checkInTime: sessionCheckIn(s), actualWorkout: normalizeDayEntry(s.actual_workout) } }
}

/**
 * Complete Session. Records the checkout timestamp on the member's open
 * session. Idempotent: completing twice reports that it was already completed
 * and never writes a second checkout.
 */
export async function completeMySession() {
    const session = await authorize('member')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const member = await getMemberForSession()
    if (!member) return { error: 'Member profile not found.' }

    try {
        const result = await adminDb.runTransaction(async (t) => {
            const now = new Date()
            await t.get(member.ref)
            const openSnap = await t.get(adminDb.collection('attendance').where('member_id', '==', member.id).where('check_out_time', '==', null))
            const open = openSnap.docs.filter(d => isOpenSession(d.data()) && d.data().gymId === session.gymId)
            if (open.length === 0) return { alreadyCompleted: true }
            let first = null
            open.forEach(d => {
                t.update(d.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Member' })
                if (!first) first = d.data()
            })
            t.update(member.ref, { activeSessionId: null })
            const minutes = Math.max(0, Math.round((now.getTime() - new Date(sessionCheckIn(first)).getTime()) / 60000))
            return { alreadyCompleted: false, checkOutTime: now.toISOString(), durationMinutes: minutes }
        })
        revalidatePath('/dashboard')
        revalidatePath('/occupancy')
        revalidatePath('/portal')
        if (result.alreadyCompleted) return { success: true, alreadyCompleted: true }
        return { success: true, ...result }
    } catch (err) {
        console.error('checkout failed:', err.message)
        return { error: 'We could not complete your session. Please try again.' }
    }
}

/** Kept for the /checkout/[gymCode] route. */
export async function markQrCheckout() {
    return completeMySession()
}

/** Owner: end a member's open session from the front desk. */
export async function ownerCheckOutMember(attendanceId) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (typeof attendanceId !== 'string' || !attendanceId || attendanceId.includes('/')) return { error: 'Invalid session.' }
    const ref = adminDb.collection('attendance').doc(attendanceId)
    try {
        const done = await adminDb.runTransaction(async (t) => {
            const snap = await t.get(ref)
            if (!snap.exists || snap.data().gymId !== session.gymId) return 'missing'
            if (!isOpenSession(snap.data())) return 'closed'
            t.update(ref, { check_out_time: new Date().toISOString(), status: 'Completed', method_out: 'Owner' })
            const memberId = snap.data().member_id
            if (memberId) t.set(adminDb.collection('members').doc(memberId), { activeSessionId: null }, { merge: true })
            return 'ok'
        })
        if (done === 'missing') return { error: 'Session not found.' }
        revalidatePath('/dashboard')
        revalidatePath('/occupancy')
        return { success: true, alreadyCompleted: done === 'closed' }
    } catch {
        return { error: 'Could not check the member out.' }
    }
}

/** Owner: manual check-in at the front desk (no phone / QR needed). */
export async function ownerCheckInMember(memberId, workout = []) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (typeof memberId !== 'string' || !memberId || memberId.includes('/')) return { error: 'Invalid member.' }

    const memberRef = adminDb.collection('members').doc(memberId)
    const { settings, tz } = await getGymContext(session.gymId)
    const maxMinutes = maxSessionMinutes(settings)
    try {
        const res = await adminDb.runTransaction(async (t) => {
            const now = new Date()
            const mSnap = await t.get(memberRef)
            if (!mSnap.exists || mSnap.data().gymId !== session.gymId) return { error: 'Member not found.' }
            const m = mSnap.data()
            if (getEffectiveStatus(m, now, tz) !== MEMBER_STATUS.ACTIVE) return { error: 'This membership is not active.' }
            const openSnap = await t.get(adminDb.collection('attendance').where('member_id', '==', memberId).where('check_out_time', '==', null))
            const open = openSnap.docs.map(d => ({ ref: d.ref, ...d.data() })).filter(isOpenSession)
            if (open.some(s => !isStaleSession(s, now, maxMinutes))) return { error: 'This member is already checked in.' }
            open.forEach(s => t.update(s.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Auto' }))
            const planned = getPlannedWorkout(m, weekdayInTz(now, tz))
            const chosen = normalizeDayEntry(Array.isArray(workout) ? workout : [])
            const ref = adminDb.collection('attendance').doc()
            t.set(ref, {
                member_id: memberId, member_name: m.name || 'Member', member_photo: m.photoURL || m.photo_url || null,
                gymId: session.gymId, check_in_time: now.toISOString(), check_out_time: null,
                method: 'Manual', status: 'Active', actual_workout: chosen.length ? chosen : planned, planned_workout: planned,
                recordedBy: session.uid,
            })
            t.update(memberRef, { activeSessionId: ref.id, lastCheckInAt: now.toISOString() })
            return { success: true }
        })
        if (res.success) { revalidatePath('/dashboard'); revalidatePath('/occupancy') }
        return res
    } catch {
        return { error: 'Could not check the member in.' }
    }
}
