'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, getMemberForSession, getTrainerForSession, getGymContext, getGymScopedDoc, isMemberAssignedToTrainer, gymDisplayName, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { shapeMember, shapeMemberForTrainer, buildIdentityFields, buildMembershipFields, buildScheduleFields, loadDuplicateIndex, checkMemberCapacity, loadPlans, loadTrainers, PAYMENT_METHODS } from '@/lib/server/members'
import { assertGymWritable } from '@/lib/server/subscription'
import { applyMemberPayment } from '@/lib/server/payments'
import { MEMBER_STATUS, normalizeStoredStatus, getOutstanding, toMoney, getExpiryDate, addDuration, cycleToMonths } from '@/lib/domain/membership'
import { normalizeEmail, normalizePhone } from '@/lib/domain/phone'
import { dateKey, parseFlexibleDate } from '@/lib/domain/dates'
import { sessionCheckIn, sessionCheckOut, sessionDurationMinutes, isOpenSession } from '@/lib/domain/occupancy'
import { normalizeDayEntry } from '@/lib/domain/schedule'
import { notify } from '@/lib/server/notify'
import { escapeHtml } from '@/lib/email'

function refresh() {
    revalidatePath('/members'); revalidatePath('/dashboard'); revalidatePath('/portal'); revalidatePath('/portal/membership')
}

async function ownerContext({ write = true } = {}) {
    const session = await authorize('owner')
    if (!session) return { fail: UNAUTHORIZED }
    if (!adminDb) return { fail: NO_DB }
    if (write) {
        const writable = await assertGymWritable(session.gymId)
        if (!writable.ok) return { fail: { error: writable.error } }
    }
    return { session }
}

// --------------------------------------------------------------------
// Reads
// --------------------------------------------------------------------

/**
 * owner   → every member of their gym
 * trainer → only members assigned to them, without financial data
 */
export async function getMembers() {
    const session = await getSession()
    if (!session || !adminDb || !session.gymId) return []
    if (session.role !== 'owner' && session.role !== 'trainer') return []

    const { tz } = await getGymContext(session.gymId)
    const now = new Date()
    const snap = await adminDb.collection('members').where('gymId', '==', session.gymId).get()

    if (session.role === 'trainer') {
        const trainer = await getTrainerForSession()
        if (!trainer) return []
        return plain(snap.docs.filter(d => isMemberAssignedToTrainer(d.data(), trainer.id, session.uid)).map(d => shapeMemberForTrainer(d.id, d.data(), now, tz)))
    }
    return plain(snap.docs.map(d => shapeMember(d.id, d.data(), now, tz)).sort((a, b) => a.name.localeCompare(b.name)))
}

function shapeAttendance(id, d) {
    return {
        id, check_in_time: sessionCheckIn(d), check_out_time: sessionCheckOut(d),
        status: isOpenSession(d) ? 'Active' : 'Completed', method: d.method || null,
        actual_workout: normalizeDayEntry(d.actual_workout), planned_workout: normalizeDayEntry(d.planned_workout),
        duration_minutes: sessionDurationMinutes(d),
    }
}

async function loadProfile(memberId, data, tz) {
    const profile = shapeMember(memberId, data, new Date(), tz)
    const attSnap = await adminDb.collection('attendance').where('member_id', '==', memberId).get()
    profile.attendance = attSnap.docs.filter(d => d.data().gymId === data.gymId).map(d => shapeAttendance(d.id, d.data()))
        .sort((a, b) => String(b.check_in_time).localeCompare(String(a.check_in_time))).slice(0, 400)
    profile.activeSession = profile.attendance.find(a => a.status === 'Active') || null
    return profile
}

/** The signed-in member's own profile. */
export async function getMyProfile() {
    const session = await authorize('member')
    if (!session || !adminDb) return null
    const member = await getMemberForSession()
    if (!member) return null
    const { gym, tz } = await getGymContext(session.gymId)
    const profile = await loadProfile(member.id, member.data, tz)
    profile.gymName = gymDisplayName(gym)
    return plain(profile)
}

/** A member profile: the owner of the gym, the assigned trainer, or the member themself. */
export async function getMemberProfile(memberId) {
    const session = await getSession()
    if (!session || !adminDb || !session.gymId) return null
    const { tz } = await getGymContext(session.gymId)

    if (session.role === 'member') {
        const me = await getMemberForSession()
        if (!me || (memberId && memberId !== me.id && memberId !== session.uid)) return null
        return plain(await loadProfile(me.id, me.data, tz))
    }
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return null
    if (session.role === 'trainer') {
        const trainer = await getTrainerForSession()
        if (!trainer || !isMemberAssignedToTrainer(snap.data(), trainer.id, session.uid)) return null
        const profile = await loadProfile(snap.id, snap.data(), tz)
        const { paymentFee, paymentAmount, outstandingAmount, payment_status, paymentMethod, address, emergencyContact, ...rest } = profile
        return plain(rest)
    }
    if (session.role !== 'owner') return null
    return plain(await loadProfile(snap.id, snap.data(), tz))
}

// --------------------------------------------------------------------
// Create
// --------------------------------------------------------------------

/**
 * Owner adds a member. The record is only written once the whole payload is
 * valid; member, opening payment and notification are committed atomically.
 */
export async function createMember(input = {}) {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const gymId = session.gymId

    const capacity = await checkMemberCapacity(gymId, 1)
    if (!capacity.ok) return { error: capacity.error }

    const { gym, tz } = await getGymContext(gymId)
    const today = dateKey(new Date(), tz)
    const [plans, trainers, dupes] = await Promise.all([loadPlans(gymId), loadTrainers(gymId), loadDuplicateIndex(gymId)])

    const identity = buildIdentityFields(input)
    const membership = buildMembershipFields(input, { plansByName: plans.byName, plansById: plans.byId, today })
    const errors = [...identity.errors, ...membership.errors]

    if (identity.fields.email && dupes.emails.has(identity.fields.email)) errors.push('A member with this e-mail already exists.')
    if (identity.fields.phone && dupes.phones.has(identity.fields.phone)) errors.push('A member with this phone number already exists.')

    let trainer = null
    if (input.trainer_id) {
        trainer = trainers.byId[input.trainer_id] || null
        if (!trainer) errors.push('The selected trainer does not belong to your gym.')
    }
    if (errors.length) return { error: errors[0], errors }

    const status = input.membershipStatus === 'Pending' ? MEMBER_STATUS.PENDING : MEMBER_STATUS.ACTIVE
    const now = new Date().toISOString()
    const memberRef = adminDb.collection('members').doc()
    const payload = {
        gymId,
        ...identity.fields,
        ...membership.fields,
        ...buildScheduleFields(input),
        status,
        is_active: status === MEMBER_STATUS.ACTIVE,
        trainer_id: trainer ? trainer.id : null,
        trainer_name: trainer ? (trainer.name || 'Trainer') : 'Unassigned',
        trainer_status: trainer ? 'Active' : null,
        authUid: null,
        photoURL: null,
        activeSessionId: null,
        sourceSystem: 'owner',
        created_at: now,
        createdBy: session.uid,
    }

    const batch = adminDb.batch()
    batch.set(memberRef, payload)
    if (payload.paymentAmount > 0) {
        batch.set(adminDb.collection('member_transactions').doc(), {
            gymId, memberId: memberRef.id, memberName: payload.name, amount: payload.paymentAmount,
            method: payload.paymentMethod, status: 'PAID', type: 'membership', note: 'Joining payment',
            created_at: now, resolved_at: now, recordedBy: session.uid,
        })
    }
    await batch.commit()

    await audit(session, 'MEMBER_CREATED', { memberId: memberRef.id })
    await notify({ gymId, targetRole: 'member', targetMemberId: memberRef.id, title: `Welcome to ${gymDisplayName(gym)}`, message: `Your ${payload.plan} membership has been set up.`, url: '/portal/membership' })
    if (trainer) await notify({ gymId, targetRole: 'trainer', targetUid: trainer.uid || trainer.id, title: 'New member assigned', message: `${payload.name} has been assigned to you.`, url: '/trainer/members' })

    // Invitation so the member can create their login for this exact record.
    let invite = { sent: false }
    if (payload.email) invite = await sendMemberInvite({ gym, email: payload.email, name: payload.name })

    refresh()
    return plain({ success: true, id: memberRef.id, ...payload, inviteSent: invite.sent, inviteError: invite.error || null })
}

async function sendMemberInvite({ gym, email, name }) {
    try {
        const { sendEmail } = await import('@/lib/email')
        const { getRegisterUrl } = await import('@/lib/url-builder')
        const gymName = gymDisplayName(gym)
        const res = await sendEmail({
            to: email,
            subject: `You have been added to ${gymName}`,
            headline: `Welcome to ${gymName}`,
            greeting: `Hi ${name},`,
            bodyHtml: `<p><strong>${escapeHtml(gymName)}</strong> has added you as a member on BGM.</p><p>Create your login with this e-mail address to check in with the gym QR code, see your workout schedule and track your membership.</p>`,
            button: { text: 'Create my account', url: getRegisterUrl({ role: 'member', gymCode: gym.gymCode || gym.id, email }) },
        })
        return { sent: !!res.success, error: res.success ? null : res.error }
    } catch (e) {
        return { sent: false, error: e.message }
    }
}

/** Owner: re-send the invitation e-mail to a member who has no login yet. */
export async function resendMemberInvite(memberId) {
    const { session, fail } = await ownerContext({ write: false })
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const m = snap.data()
    if (m.authUid) return { error: 'This member already has an account.' }
    if (!m.email) return { error: 'This member has no e-mail address on file.' }
    const { gym } = await getGymContext(session.gymId)
    const res = await sendMemberInvite({ gym, email: m.email, name: m.name || 'there' })
    return res.sent ? { success: true } : { error: res.error || 'The invitation could not be sent.' }
}

// --------------------------------------------------------------------
// Update
// --------------------------------------------------------------------

const MEMBER_SELF_FIELDS = ['name', 'phone', 'dob', 'gender', 'address', 'emergencyContact', 'goal', 'preferredTime', 'height', 'weight', 'medicalNotes']

/**
 * Update a member.
 *   member → only their own profile fields and workout schedule
 *   owner  → identity, schedule, trainer and biometric mapping of members of their gym
 * Status, dates and money are changed through the dedicated membership actions.
 */
export async function updateMember(id, updates = {}) {
    const session = await getSession()
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!updates || typeof updates !== 'object') return { error: 'Nothing to update.' }

    const patch = {}
    const clip = (v, n) => String(v ?? '').trim().slice(0, n)

    if ('schedule' in updates || 'noFixedSchedule' in updates || 'weeklySchedule' in updates) {
        Object.assign(patch, buildScheduleFields({ noFixedSchedule: updates.noFixedSchedule, schedule: updates.schedule || updates.weeklySchedule }))
    }

    if (session.role === 'member') {
        const me = await getMemberForSession()
        if (!me) return { error: 'Member profile not found.' }
        for (const key of MEMBER_SELF_FIELDS) {
            if (!(key in updates)) continue
            if (key === 'phone') {
                const phone = updates.phone ? normalizePhone(updates.phone) : ''
                if (updates.phone && !phone) return { error: 'Phone number is not valid.' }
                patch.phone = phone
            } else if (key === 'dob') patch.dob = updates.dob ? (parseFlexibleDate(updates.dob) || '') : ''
            else if (key === 'name') { const n = clip(updates.name, 80); if (n.length < 2) return { error: 'Name is required.' }; patch.name = n }
            else patch[key] = clip(updates[key], 240)
        }
        if (Object.keys(patch).length === 0) return { error: 'Nothing to update.' }
        await me.ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true })
        refresh()
        return plain({ success: true, id: me.id, ...patch })
    }

    if (session.role !== 'owner') return UNAUTHORIZED
    const writable = await assertGymWritable(session.gymId)
    if (!writable.ok) return { error: writable.error }
    const snap = await getGymScopedDoc('members', id, session.gymId)
    if (!snap) return { error: 'Member not found.' }

    const dupes = await loadDuplicateIndex(session.gymId)
    if ('name' in updates) { const n = clip(updates.name, 80); if (n.length < 2) return { error: 'Name is required.' }; patch.name = n }
    if ('email' in updates) {
        const email = normalizeEmail(updates.email) || ''
        if (email && dupes.emails.has(email) && dupes.emails.get(email) !== id) return { error: 'Another member already uses this e-mail.' }
        if (snap.data().authUid && email !== (snap.data().email || '')) return { error: 'This member has a login; their e-mail cannot be changed here.' }
        patch.email = email
    }
    if ('phone' in updates) {
        const phone = updates.phone ? normalizePhone(updates.phone) : ''
        if (updates.phone && !phone) return { error: 'Phone number is not valid.' }
        if (phone && dupes.phones.has(phone) && dupes.phones.get(phone) !== id) return { error: 'Another member already uses this phone number.' }
        patch.phone = phone
    }
    for (const key of ['gender', 'address', 'emergencyContact', 'goal', 'preferredTime', 'medicalNotes', 'biometric_id']) {
        if (key in updates) patch[key] = clip(updates[key], 240)
    }
    if ('dob' in updates) patch.dob = updates.dob ? (parseFlexibleDate(updates.dob) || '') : ''
    if ('trainer_id' in updates) {
        const res = await resolveTrainer(session.gymId, updates.trainer_id)
        if (res.error) return res
        Object.assign(patch, res.fields)
    }
    if (Object.keys(patch).length === 0) return { error: 'Nothing to update.' }

    await snap.ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true })
    refresh()
    return plain({ success: true, id, ...patch })
}

async function resolveTrainer(gymId, trainerId) {
    if (!trainerId) return { fields: { trainer_id: null, trainer_name: 'Unassigned', trainer_status: null } }
    const tSnap = await getGymScopedDoc('trainers', trainerId, gymId)
    if (!tSnap) return { error: 'The selected trainer does not belong to your gym.' }
    return { fields: { trainer_id: tSnap.id, trainer_name: tSnap.data().name || 'Trainer', trainer_status: 'Active' }, trainer: { id: tSnap.id, ...tSnap.data() } }
}

/** Owner: assign (or unassign with null) a trainer. */
export async function assignTrainerToMember(memberId, trainerId) {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const res = await resolveTrainer(session.gymId, trainerId)
    if (res.error) return res
    await snap.ref.update(res.fields)
    if (res.trainer) await notify({ gymId: session.gymId, targetRole: 'trainer', targetUid: res.trainer.uid || res.trainer.id, title: 'New member assigned', message: `${snap.data().name || 'A member'} has been assigned to you.`, url: '/trainer/members' })
    refresh(); revalidatePath('/trainers')
    return { success: true }
}

// --------------------------------------------------------------------
// Membership lifecycle (owner only)
// --------------------------------------------------------------------

async function setStatus(memberId, status, auditAction, extra = {}) {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const current = normalizeStoredStatus(snap.data())
    if (current === status && Object.keys(extra).length === 0) return { success: true, unchanged: true }
    await snap.ref.update({ status, is_active: status === MEMBER_STATUS.ACTIVE, statusChangedAt: new Date().toISOString(), ...extra })
    await audit(session, auditAction, { memberId, from: current, to: status })
    refresh()
    return { success: true }
}

/**
 * Approve a pending member. `details` may carry the reviewed membership
 * (plan, dates, fee, payment, trainer, schedule) when the member registered
 * themself and the owner completes the record during review.
 */
export async function approveMember(memberId, details = null) {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const m = snap.data()
    const { gym, tz } = await getGymContext(session.gymId)
    const now = new Date().toISOString()
    const update = { status: MEMBER_STATUS.ACTIVE, is_active: true, approvedAt: now, approvedBy: session.uid }
    let openingPayment = 0

    if (details && typeof details === 'object') {
        const plans = await loadPlans(session.gymId)
        const membership = buildMembershipFields({ ...details, plan: details.plan || m.plan }, { plansByName: plans.byName, plansById: plans.byId, today: dateKey(new Date(), tz) })
        if (membership.errors.length) return { error: membership.errors[0], errors: membership.errors }
        Object.assign(update, membership.fields)
        // Money already recorded for this member is never overwritten by a re-approval.
        if (toMoney(m.paymentAmount) > 0) {
            delete update.paymentAmount; delete update.outstandingAmount; delete update.payment_status; delete update.paymentFee
        } else {
            openingPayment = membership.fields.paymentAmount
        }
        if ('trainer_id' in details) {
            const res = await resolveTrainer(session.gymId, details.trainer_id)
            if (res.error) return res
            Object.assign(update, res.fields)
        }
        if ('schedule' in details || 'noFixedSchedule' in details) Object.assign(update, buildScheduleFields(details))
    }

    const batch = adminDb.batch()
    batch.update(snap.ref, update)
    if (openingPayment > 0) {
        batch.set(adminDb.collection('member_transactions').doc(), {
            gymId: session.gymId, memberId, memberName: m.name || 'Member', amount: openingPayment,
            method: update.paymentMethod || 'Cash', status: 'PAID', type: 'membership', note: 'Joining payment',
            created_at: now, resolved_at: now, recordedBy: session.uid,
        })
    }
    await batch.commit()

    await audit(session, 'MEMBER_APPROVED', { memberId })
    await notify({ gymId: session.gymId, targetRole: 'member', targetMemberId: memberId, title: 'Membership approved', message: `Your membership at ${gymDisplayName(gym)} is now active.`, url: '/portal/membership' })
    refresh()
    return { success: true }
}

export async function deactivateMember(memberId) { return setStatus(memberId, MEMBER_STATUS.INACTIVE, 'MEMBER_DEACTIVATED') }
export async function suspendMember(memberId) { return setStatus(memberId, MEMBER_STATUS.SUSPENDED, 'MEMBER_SUSPENDED') }
export async function cancelMember(memberId) { return setStatus(memberId, MEMBER_STATUS.CANCELLED, 'MEMBER_CANCELLED') }
export async function reactivateMember(memberId) { return setStatus(memberId, MEMBER_STATUS.ACTIVE, 'MEMBER_REACTIVATED') }

/**
 * Renew (or change) a membership: new plan period and a new charge.
 * Any unpaid balance from the previous period is carried forward.
 */
export async function renewMembership(memberId, input = {}) {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const m = snap.data()
    const { tz } = await getGymContext(session.gymId)
    const today = dateKey(new Date(), tz)
    const plans = await loadPlans(session.gymId)
    const plan = (input.planId && plans.byId[input.planId]) || plans.byName[String(input.plan || m.plan || '').toLowerCase()] || null

    // Default period: continue from the current expiry when it has not lapsed yet.
    const currentExpiry = getExpiryDate(m)
    const defaultStart = currentExpiry && currentExpiry >= today ? currentExpiry : today
    const startDate = parseFlexibleDate(input.startDate) || defaultStart
    const expiryDate = input.expiryDate ? parseFlexibleDate(input.expiryDate) : addDuration(startDate, cycleToMonths(plan?.cycle || plan?.duration))
    if (!expiryDate) return { error: 'Expiry date is not a valid date.' }
    if (expiryDate <= startDate) return { error: 'Expiry date must be after the start date.' }
    if (expiryDate < today) return { error: 'Expiry date is in the past.' }

    const membership = buildMembershipFields({ ...input, plan: plan?.name || input.plan || m.plan, planId: plan?.id, startDate, expiryDate }, { plansByName: plans.byName, plansById: plans.byId, today })
    if (membership.errors.length) return { error: membership.errors[0], errors: membership.errors }
    const f = membership.fields
    const carried = getOutstanding(m)
    const now = new Date().toISOString()
    const renewalId = `rn_${memberId}_${f.startDate}_${f.expiryDate}`

    try {
        const result = await adminDb.runTransaction(async (t) => {
            const fresh = await t.get(snap.ref)
            if (fresh.data().lastRenewalId === renewalId) return { duplicate: true }
            const outstanding = Math.round((carried + f.outstandingAmount) * 100) / 100
            t.update(snap.ref, {
                plan: f.plan, planId: f.planId, startDate: f.startDate, expiryDate: f.expiryDate,
                paymentFee: f.paymentFee, paymentAmount: f.paymentAmount, outstandingAmount: outstanding,
                payment_status: outstanding === 0 ? 'Paid' : (f.paymentAmount > 0 ? 'Partial' : 'Unpaid'),
                paymentMethod: f.paymentMethod, status: MEMBER_STATUS.ACTIVE, is_active: true,
                lastRenewalId: renewalId, renewedAt: now,
            })
            if (f.paymentAmount > 0) {
                t.set(adminDb.collection('member_transactions').doc(), {
                    gymId: session.gymId, memberId, memberName: m.name || 'Member', amount: f.paymentAmount,
                    method: f.paymentMethod, status: 'PAID', type: 'membership', note: `Renewal ${f.startDate} → ${f.expiryDate}`,
                    created_at: now, resolved_at: now, recordedBy: session.uid,
                })
            }
            return { duplicate: false, outstanding }
        })
        if (result.duplicate) return { error: 'This renewal has already been recorded.' }
        await audit(session, 'MEMBERSHIP_RENEWED', { memberId, plan: f.plan, startDate: f.startDate, expiryDate: f.expiryDate, fee: f.paymentFee })
        await notify({ gymId: session.gymId, targetRole: 'member', targetMemberId: memberId, title: 'Membership renewed', message: `Your ${f.plan} membership is valid until ${f.expiryDate}.`, url: '/portal/membership' })
        refresh()
        return { success: true, expiryDate: f.expiryDate, outstanding: result.outstanding }
    } catch (e) {
        return { error: 'Could not renew the membership.' }
    }
}

/** Owner: mark the full outstanding balance as collected (cash by default). */
export async function markPaymentPaid(memberId, method = 'Cash') {
    const { session, fail } = await ownerContext()
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { error: 'Member not found.' }
    const outstanding = getOutstanding(snap.data())
    if (!(outstanding > 0)) return { error: 'This member has no outstanding balance.' }
    try {
        await applyMemberPayment({
            txRef: adminDb.collection('member_transactions').doc(), gymId: session.gymId, memberId, amount: outstanding,
            method: PAYMENT_METHODS.includes(method) ? method : 'Cash', extra: { recordedBy: session.uid, note: 'Balance settled' },
        })
        await audit(session, 'MEMBER_PAYMENT_RECORDED', { memberId, amount: outstanding })
        refresh(); revalidatePath('/dashboard/payments')
        return { success: true }
    } catch {
        return { error: 'Could not record the payment.' }
    }
}

// --------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------

/** Owner: remove a member and their footprint (payment records are retained, anonymised). */
export async function deleteMember(memberId) {
    const { session, fail } = await ownerContext({ write: false })
    if (fail) return fail
    const snap = await getGymScopedDoc('members', memberId, session.gymId)
    if (!snap) return { success: false, error: 'Member not found.' }
    try {
        const { deleteMemberFootprint } = await import('@/lib/server/deletion')
        const result = await deleteMemberFootprint(snap.ref, { actor: session })
        refresh()
        return plain({ success: true, ...result })
    } catch (e) {
        return { success: false, error: 'Could not delete the member.' }
    }
}
