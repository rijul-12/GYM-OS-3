// Member record helpers shared by owner actions, registration and import (server only).
import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/server'
import { computeDues, toMoney, getEffectiveStatus, daysUntilExpiry, getExpiryDate, getStartDate, getOutstanding, normalizeStoredStatus, BILLABLE_STATUSES } from '@/lib/domain/membership'
import { getMemberSchedule, normalizeSchedule } from '@/lib/domain/schedule'
import { normalizePhone, normalizeEmail, isValidEmail } from '@/lib/domain/phone'
import { parseFlexibleDate } from '@/lib/domain/dates'
import { computeSubscriptionStatus } from '@/lib/server/subscription'

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']

const clip = (v, n) => (v === null || v === undefined ? '' : String(v).trim().slice(0, n))

/** Canonical view of a member document for the owner portal. */
export function shapeMember(id, d, now = new Date(), tz = 'Asia/Kolkata') {
    const { noFixedSchedule, schedule } = getMemberSchedule(d)
    return {
        id,
        gymId: d.gymId,
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        photoURL: d.photoURL || d.photo_url || null,
        dob: d.dob || '',
        gender: d.gender || '',
        address: d.address || '',
        emergencyContact: d.emergencyContact || '',
        goal: d.goal || d.fitnessGoal || '',
        preferredTime: d.preferredTime || d.preferredWorkoutTime || '',
        medicalNotes: d.medicalNotes || d.medicalConditions || '',
        height: d.height || d.bodyMeasurements?.height || '',
        weight: d.weight || d.bodyMeasurements?.weight || '',
        plan: d.plan || '',
        planId: d.planId || null,
        storedStatus: normalizeStoredStatus(d),
        status: getEffectiveStatus(d, now, tz),
        is_active: getEffectiveStatus(d, now, tz) === 'Active',
        startDate: getStartDate(d),
        expiryDate: getExpiryDate(d),
        daysUntilExpiry: daysUntilExpiry(d, now, tz),
        paymentFee: toMoney(d.paymentFee),
        paymentAmount: toMoney(d.paymentAmount),
        outstandingAmount: getOutstanding(d),
        payment_status: d.payment_status || 'Unpaid',
        paymentMethod: d.paymentMethod || '',
        trainer_id: d.trainer_id || d.trainerId || d.trainers?.id || null,
        trainer_name: d.trainer_name || d.trainers?.name || 'Unassigned',
        trainer_status: d.trainer_status || null,
        trainers: { name: d.trainer_name || d.trainers?.name || 'Unassigned' },
        noFixedSchedule,
        schedule,
        hasAccount: !!d.authUid,
        sourceSystem: d.sourceSystem || null,
        importBatchId: d.importBatchId || null,
        biometric_id: d.biometric_id || '',
        created_at: typeof d.created_at === 'string' ? d.created_at : (typeof d.createdAt === 'string' ? d.createdAt : null),
        trainer_notes: Array.isArray(d.trainer_notes) ? d.trainer_notes : [],
        progress_history: Array.isArray(d.progress_history) ? d.progress_history : [],
    }
}

/** The subset a trainer may see about an assigned member: no financial data. */
export function shapeMemberForTrainer(id, d, now, tz) {
    const m = shapeMember(id, d, now, tz)
    const { paymentFee, paymentAmount, outstandingAmount, payment_status, paymentMethod, address, emergencyContact, biometric_id, importBatchId, sourceSystem, ...rest } = m
    return rest
}

/**
 * Validates and normalises the membership part of a member (plan, dates, fee,
 * payment). Dues and payment status are always computed here.
 */
export function buildMembershipFields(input, { plansByName = {}, plansById = {}, today }) {
    const errors = []
    let planName = clip(input.plan, 60)
    let planId = null
    const plan = (input.planId && plansById[input.planId]) || plansByName[planName.toLowerCase()] || null
    if (plan) { planName = plan.name; planId = plan.id }
    if (!planName) errors.push('Select a membership plan.')

    const startDate = parseFlexibleDate(input.startDate) || today
    let expiryDate = null
    if (input.expiryDate) {
        expiryDate = parseFlexibleDate(input.expiryDate)
        if (!expiryDate) errors.push('Expiry date is not a valid date.')
        else if (expiryDate < startDate) errors.push('Expiry date cannot be before the start date.')
    }

    const feeRaw = input.paymentFee !== '' && input.paymentFee !== undefined && input.paymentFee !== null ? input.paymentFee : (plan ? plan.price : 0)
    const fee = toMoney(feeRaw)
    const paid = toMoney(input.amountPaid ?? input.paymentAmount ?? 0)
    if (fee < 0 || paid < 0) errors.push('Amounts cannot be negative.')
    if (paid > fee) errors.push('Amount paid cannot be more than the membership fee.')
    const dues = computeDues(fee, Math.min(paid, fee))
    const method = PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : 'Cash'

    return {
        errors,
        fields: {
            plan: planName, planId, startDate, expiryDate,
            paymentFee: dues.fee, paymentAmount: dues.paid, outstandingAmount: dues.outstanding,
            payment_status: dues.paymentStatus, paymentMethod: method,
        },
    }
}

/** Validates the personal part of a member. */
export function buildIdentityFields(input) {
    const errors = []
    const name = clip(input.name, 80)
    if (name.length < 2) errors.push('Full name is required.')
    const email = normalizeEmail(input.email)
    if (email && !isValidEmail(email)) errors.push('E-mail address is not valid.')
    let phone = null
    if (clip(input.phone, 30)) {
        phone = normalizePhone(input.phone)
        if (!phone) errors.push('Phone number is not valid.')
    }
    if (!email && !phone) errors.push('Provide at least a phone number or an e-mail address.')
    const dob = input.dob ? parseFlexibleDate(input.dob) : null
    return {
        errors,
        fields: {
            name, email: email || '', phone: phone || '',
            dob: dob || '', gender: clip(input.gender, 20), address: clip(input.address, 240),
            emergencyContact: clip(input.emergencyContact, 80), goal: clip(input.goal, 120),
            preferredTime: clip(input.preferredTime, 40),
        },
    }
}

export function buildScheduleFields(input) {
    if (input.noFixedSchedule === true || !input.schedule || typeof input.schedule !== 'object') {
        return { noFixedSchedule: true, schedule: null }
    }
    const schedule = normalizeSchedule(input.schedule)
    const hasAny = Object.values(schedule).some(list => list.length > 0)
    return hasAny ? { noFixedSchedule: false, schedule } : { noFixedSchedule: true, schedule: null }
}

/** Existing members of the gym indexed for duplicate detection. */
export async function loadDuplicateIndex(gymId) {
    const snap = await adminDb.collection('members').where('gymId', '==', gymId).get()
    const emails = new Map(), phones = new Map(), sourceIds = new Map()
    snap.docs.forEach(d => {
        const m = d.data()
        const e = normalizeEmail(m.email); if (e) emails.set(e, d.id)
        const p = normalizePhone(m.phone); if (p) phones.set(p, d.id)
        if (m.sourceMemberId) sourceIds.set(String(m.sourceMemberId), d.id)
    })
    return { emails, phones, sourceIds, count: snap.size, docs: snap.docs }
}

/** Is there room for `adding` more members under the gym's BGM plan? */
export async function checkMemberCapacity(gymId, adding = 1) {
    const sub = await computeSubscriptionStatus(gymId)
    if (!sub) return { ok: false, error: 'Gym subscription could not be loaded.' }
    if (sub.isReadOnly) return { ok: false, error: 'Your BGM subscription has expired. Renew it to add members.' }
    if (sub.memberLimit < 999999 && sub.activeMembers + adding > sub.memberLimit) {
        return { ok: false, error: `Your plan allows ${sub.memberLimit} members and you have ${sub.activeMembers}. Upgrade your plan to add more.` }
    }
    return { ok: true, sub }
}

export async function loadPlans(gymId) {
    const snap = await adminDb.collection('plans').where('gymId', '==', gymId).get()
    const byName = {}, byId = {}
    snap.docs.forEach(d => {
        const p = { id: d.id, ...d.data(), price: toMoney(d.data().price) }
        byId[d.id] = p
        if (p.name) byName[String(p.name).toLowerCase()] = p
    })
    return { byName, byId }
}

export async function loadTrainers(gymId) {
    const snap = await adminDb.collection('trainers').where('gymId', '==', gymId).get()
    const byId = {}, byName = {}
    snap.docs.forEach(d => {
        const t = { id: d.id, ...d.data() }
        byId[d.id] = t
        if (t.name) byName[String(t.name).trim().toLowerCase()] = t
    })
    return { byId, byName }
}

/** A single-use invitation token: the raw token goes in the e-mail, only its hash is stored. */
export function newInviteToken() {
    const token = crypto.randomBytes(32).toString('base64url')
    return { token, hash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
}

export const hashInviteToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex')

export { BILLABLE_STATUSES }
