'use server'

import crypto from 'crypto'
import { adminDb, adminAuth, isFirebaseConfigured, missingFirebaseEnv } from '@/lib/firebase/server'
import { newTrialSubscription } from '@/lib/server/subscription'
import { checkMemberCapacity, hashInviteToken } from '@/lib/server/members'
import { normalizeEmail, normalizePhone, isValidEmail } from '@/lib/domain/phone'
import { normalizeSchedule } from '@/lib/domain/schedule'
import { MEMBER_STATUS } from '@/lib/domain/membership'
import { notify } from '@/lib/server/notify'
import { escapeHtml } from '@/lib/email'

const clip = (v, n) => String(v ?? '').trim().slice(0, n)

function notConfigured() {
    const missing = missingFirebaseEnv()
    return { error: `Registration is unavailable: the server is not configured${missing.length ? ` (missing ${missing.join(', ')})` : ''}.` }
}

function validateCredentials(data) {
    const email = normalizeEmail(data.email)
    if (!email || !isValidEmail(email)) return { error: 'Enter a valid e-mail address.' }
    const password = String(data.password || '')
    if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
    if (password.length > 128) return { error: 'Password is too long.' }
    return { email, password }
}

function authErrorMessage(err) {
    switch (err?.code) {
        case 'auth/email-already-exists': return 'An account with this e-mail already exists. Sign in instead, or reset your password.'
        case 'auth/invalid-password': return 'Password must be at least 8 characters.'
        case 'auth/invalid-email': return 'Enter a valid e-mail address.'
        case 'auth/phone-number-already-exists': return 'This phone number is already linked to another account.'
        default: return 'We could not create your account. Please try again.'
    }
}

async function generateUniqueGymCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    for (let attempt = 0; attempt < 12; attempt++) {
        const bytes = crypto.randomBytes(7)
        const code = `GYM-${letters[bytes[0] % letters.length]}${letters[bytes[1] % letters.length]}${letters[bytes[2] % letters.length]}-${1000 + (bytes.readUInt32BE(3) % 9000)}`
        const [byId, byField] = await Promise.all([
            adminDb.collection('gyms').doc(code).get(),
            adminDb.collection('gyms').where('gymCode', '==', code).limit(1).get(),
        ])
        if (!byId.exists && byField.empty) return code
    }
    throw new Error('Could not allocate a gym code')
}

/** Resolves the gym a join code refers to. Only the gym's CURRENT code is accepted. */
async function resolveGym(gymCodeRaw) {
    const code = clip(gymCodeRaw, 40).toUpperCase()
    if (!code) return null
    const q = await adminDb.collection('gyms').where('gymCode', '==', code).limit(1).get()
    if (q.empty) return null
    return { id: q.docs[0].id, data: q.docs[0].data() }
}

async function sendWelcome({ to, subject, headline, greeting, bodyHtml, buttonText }) {
    try {
        const { sendEmail } = await import('@/lib/email')
        const { getLoginUrl } = await import('@/lib/url-builder')
        await sendEmail({ to, subject, headline, greeting, bodyHtml, button: { text: buttonText, url: getLoginUrl() } })
    } catch { /* welcome e-mail is best-effort */ }
}

async function sendVerification(email) {
    try {
        const { sendEmail } = await import('@/lib/email')
        const { toAppActionUrl } = await import('@/lib/url-builder')
        const link = await adminAuth.generateEmailVerificationLink(email)
        await sendEmail({
            to: email, subject: 'Verify your BGM e-mail address', headline: 'Confirm your e-mail',
            bodyHtml: '<p>Please confirm that this e-mail address belongs to you.</p>',
            button: { text: 'Verify e-mail', url: toAppActionUrl(link, '/verify-email') },
        })
    } catch { /* best-effort */ }
}

// --------------------------------------------------------------------
// Gym owner
// --------------------------------------------------------------------
export async function processOwnerRegistration(data = {}) {
    if (!isFirebaseConfigured()) return notConfigured()
    const creds = validateCredentials(data)
    if (creds.error) return creds

    const gymName = clip(data.gymName, 80)
    const ownerName = clip(data.ownerName, 80)
    if (gymName.length < 2) return { error: 'Gym name is required.' }
    if (ownerName.length < 2) return { error: 'Owner name is required.' }
    const phone = normalizePhone(data.phone)
    if (!phone) return { error: 'Enter a valid phone number.' }
    const capacity = parseInt(data.membershipCapacity, 10)

    // One account → one gym. The Auth e-mail uniqueness check below is the atomic guard
    // against double submissions; this query only produces a friendlier message.
    const existingGym = await adminDb.collection('gyms').where('email', '==', creds.email).limit(1).get()
    if (!existingGym.empty) return { error: 'A gym is already registered with this e-mail. Sign in instead.' }

    let user
    try {
        user = await adminAuth.createUser({ email: creds.email, password: creds.password, displayName: ownerName })
    } catch (err) {
        return { error: authErrorMessage(err) }
    }

    try {
        const gymCode = await generateUniqueGymCode()
        await adminAuth.setCustomUserClaims(user.uid, { role: 'owner', gymCode })
        const now = new Date()
        const subscription = newTrialSubscription(now)

        const batch = adminDb.batch()
        batch.set(adminDb.collection('gyms').doc(gymCode), {
            gymCode, gymName, name: gymName, ownerName, ownerUid: user.uid,
            email: creds.email, ownerEmail: creds.email, phone,
            city: clip(data.city, 60).toLowerCase(), state: clip(data.state, 60), country: clip(data.country, 60), pinCode: clip(data.pinCode, 12),
            gymType: clip(data.gymType, 40), capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
            createdAt: now.toISOString(), qrCreatedDate: now.toISOString(),
            status: 'Active', subscriptionStatus: 'Trial', isTrial: true, trialEndDate: subscription.trialEndDate, plan: 'Trial',
        })
        batch.set(adminDb.collection('gym_settings').doc(gymCode), {
            gymName, timezone: clip(data.timezone, 40) || 'Asia/Kolkata', currency: clip(data.currency, 12) || '₹ INR',
            primaryColor: '#ef4444', accentColor: '#f87171', onboarded: false,
            buildingCapacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
            upi_enabled: false, upi_show_to_members: true, razorpay_enabled: false,
        })
        batch.set(adminDb.collection('gym_subscriptions').doc(gymCode), subscription)
        batch.set(adminDb.collection('users').doc(user.uid), {
            uid: user.uid, role: 'owner', gymCode, name: ownerName, email: creds.email, phone, photoURL: null, createdAt: now.toISOString(),
        })
        await batch.commit()

        await notify({ targetRole: 'super_admin', title: 'New gym registered', message: `${gymName} (${gymCode}) signed up.`, url: '/super-admin/gyms' })
        await sendWelcome({
            to: creds.email, subject: 'Welcome to BGM — your gym is ready',
            headline: `Welcome to BGM, ${ownerName}`, greeting: 'Your gym has been created.',
            bodyHtml: `<p>Thank you for choosing BGM to run <strong>${escapeHtml(gymName)}</strong>.</p><p>Your gym code is <strong style="color:#ef4444;font-size:18px;">${escapeHtml(gymCode)}</strong>. Share it with your trainers and members so they can join.</p><p>Your free trial runs until ${new Date(subscription.trialEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>`,
            buttonText: 'Sign in to your dashboard',
        })
        await sendVerification(creds.email)
        return { success: true, gymCode, uid: user.uid }
    } catch (err) {
        // Never leave a login without a gym behind: roll the account back.
        await adminAuth.deleteUser(user.uid).catch(() => { })
        console.error('owner registration failed:', err.message)
        return { error: 'We could not finish setting up your gym. Nothing was created — please try again.' }
    }
}

// --------------------------------------------------------------------
// Trainer — by owner invitation (active immediately) or by gym code (needs approval)
// --------------------------------------------------------------------
export async function getTrainerInvite(token) {
    if (!isFirebaseConfigured() || !token) return { error: 'This invitation is not valid.' }
    const q = await adminDb.collection('trainers').where('inviteTokenHash', '==', hashInviteToken(token)).limit(1).get()
    if (q.empty) return { error: 'This invitation is no longer valid. Ask the gym owner to send a new one.' }
    const t = q.docs[0].data()
    if (t.uid) return { error: 'This invitation has already been used. Please sign in.' }
    if (t.inviteExpiresAt && new Date(t.inviteExpiresAt).getTime() < Date.now()) return { error: 'This invitation has expired. Ask the gym owner to send a new one.' }
    const gym = await adminDb.collection('gyms').doc(t.gymId).get()
    return { success: true, email: t.email, name: t.name, gymName: gym.exists ? (gym.data().gymName || gym.data().name) : 'your gym' }
}

export async function processTrainerRegistration(data = {}) {
    if (!isFirebaseConfigured()) return notConfigured()
    const creds = validateCredentials(data)
    if (creds.error) return creds

    let invited = null
    let gymId = null
    if (data.inviteToken) {
        const q = await adminDb.collection('trainers').where('inviteTokenHash', '==', hashInviteToken(data.inviteToken)).limit(1).get()
        if (q.empty) return { error: 'This invitation is no longer valid. Ask the gym owner to send a new one.' }
        invited = q.docs[0]
        const t = invited.data()
        if (t.uid) return { error: 'This invitation has already been used. Please sign in.' }
        if (t.inviteExpiresAt && new Date(t.inviteExpiresAt).getTime() < Date.now()) return { error: 'This invitation has expired.' }
        if (normalizeEmail(t.email) !== creds.email) return { error: 'Use the e-mail address the invitation was sent to.' }
        gymId = t.gymId
    } else {
        const gym = await resolveGym(data.gymCode)
        if (!gym) return { error: 'Invalid gym code. Please check with your gym.' }
        gymId = gym.id
    }

    const name = clip(data.trainerName || data.name || invited?.data().name, 80)
    if (name.length < 2) return { error: 'Your name is required.' }
    let phone = ''
    if (data.phone) { phone = normalizePhone(data.phone); if (!phone) return { error: 'Enter a valid phone number.' } }

    let user
    try {
        user = await adminAuth.createUser({ email: creds.email, password: creds.password, displayName: name })
    } catch (err) {
        return { error: authErrorMessage(err) }
    }

    try {
        await adminAuth.setCustomUserClaims(user.uid, { role: 'trainer', gymCode: gymId })
        const now = new Date().toISOString()
        const profile = {
            name, phone: phone || invited?.data().phone || '',
            specialization: clip(data.specialization, 80) || invited?.data().specialization || '',
            experience: clip(data.experience, 40) || invited?.data().experience || '',
            workingDays: Array.isArray(data.workingDays) ? data.workingDays.slice(0, 7).map(d => String(d).slice(0, 12)) : [],
            preferredTiming: clip(data.preferredTiming, 60),
        }
        if (invited) {
            await invited.ref.update({ ...profile, uid: user.uid, status: 'Active', is_active: true, inviteTokenHash: null, inviteExpiresAt: null, acceptedAt: now })
            await adminAuth.updateUser(user.uid, { emailVerified: true }) // the invitation link proved ownership of the inbox
            await notify({ gymId, targetRole: 'owner', title: 'Trainer joined', message: `${name} accepted your invitation.`, url: '/trainers' })
        } else {
            await adminDb.collection('trainers').doc(user.uid).set({
                ...profile, gymId, uid: user.uid, email: creds.email, photoURL: null,
                status: 'Pending', is_active: false, selfRegistered: true, created_at: now,
            })
            await notify({ gymId, targetRole: 'owner', title: 'Trainer awaiting approval', message: `${name} registered as a trainer and needs your approval.`, url: '/trainers' })
            await sendVerification(creds.email)
        }
        await sendWelcome({
            to: creds.email, subject: 'Welcome to BGM for trainers', headline: 'Your trainer account is ready', greeting: `Hello ${name},`,
            bodyHtml: invited ? '<p>Your invitation is accepted and your account is active.</p>' : '<p>Your account has been created. The gym owner needs to approve your profile before you can sign in.</p>',
            buttonText: 'Sign in',
        })
        return { success: true, uid: user.uid, pendingApproval: !invited }
    } catch (err) {
        await adminAuth.deleteUser(user.uid).catch(() => { })
        console.error('trainer registration failed:', err.message)
        return { error: 'We could not finish creating your trainer profile. Nothing was created — please try again.' }
    }
}

// --------------------------------------------------------------------
// Member
// --------------------------------------------------------------------
export async function processMemberRegistration(data = {}) {
    if (!isFirebaseConfigured()) return notConfigured()
    const creds = validateCredentials(data)
    if (creds.error) return creds

    const gym = await resolveGym(data.gymCode)
    if (!gym) return { error: 'Invalid gym code. Please check with your gym.' }
    if (String(gym.data.status || 'Active').toLowerCase() !== 'active') return { error: 'This gym is not accepting registrations right now.' }

    const name = clip(data.name, 80)
    if (name.length < 2) return { error: 'Your name is required.' }
    let phone = ''
    if (data.phone) { phone = normalizePhone(data.phone); if (!phone) return { error: 'Enter a valid phone number.' } }

    // If the owner already added or imported this person, the login is linked to that
    // record instead of creating a second membership.
    const existing = await adminDb.collection('members').where('gymId', '==', gym.id).where('email', '==', creds.email).limit(2).get()
    const linkable = existing.docs.find(d => !d.data().authUid) || null
    if (!linkable && !existing.empty) return { error: 'An account already exists for this e-mail at this gym. Sign in instead.' }

    if (!linkable) {
        const capacity = await checkMemberCapacity(gym.id, 1)
        if (!capacity.ok) return { error: 'This gym cannot accept new members right now. Please contact the front desk.' }
    }

    let user
    try {
        user = await adminAuth.createUser({ email: creds.email, password: creds.password, displayName: name })
    } catch (err) {
        return { error: authErrorMessage(err) }
    }

    try {
        await adminAuth.setCustomUserClaims(user.uid, { role: 'member', gymCode: gym.id })
        const now = new Date().toISOString()
        const gymName = gym.data.gymName || gym.data.name || 'your gym'

        const hasSchedule = data.weeklySchedule && typeof data.weeklySchedule === 'object'
        const schedule = hasSchedule ? normalizeSchedule(data.weeklySchedule) : null
        const scheduleFields = schedule && Object.values(schedule).some(l => l.length) ? { noFixedSchedule: false, schedule } : { noFixedSchedule: true, schedule: null }

        if (linkable) {
            await linkable.ref.set({ authUid: user.uid, accountLinkedAt: now, ...(phone && !linkable.data().phone ? { phone } : {}) }, { merge: true })
            await notify({ gymId: gym.id, targetRole: 'owner', title: 'Member activated their account', message: `${linkable.data().name || name} created their login.`, url: '/members' })
        } else {
            await adminDb.collection('members').doc(user.uid).set({
                gymId: gym.id, authUid: user.uid, name, email: creds.email, phone,
                gender: clip(data.gender, 20), dob: '', address: '',
                emergencyContact: clip(data.emergencyContact, 80),
                height: clip(data.height, 12), weight: clip(data.weight, 12), medicalNotes: clip(data.medicalConditions, 300),
                goal: clip(data.fitnessGoal, 120), preferredTime: clip(data.preferredWorkoutTime, 40),
                ...scheduleFields,
                // Self-registrations wait for the owner to review and approve them.
                plan: '', planId: null, status: MEMBER_STATUS.PENDING, is_active: false,
                startDate: null, expiryDate: null,
                paymentFee: 0, paymentAmount: 0, outstandingAmount: 0, payment_status: 'Unpaid', paymentMethod: '',
                trainer_id: null, trainer_name: 'Unassigned', trainer_status: null,
                photoURL: null, activeSessionId: null, sourceSystem: 'self_registration', created_at: now,
            })
            await notify({ gymId: gym.id, targetRole: 'owner', title: 'New member awaiting approval', message: `${name} registered and is waiting for your review.`, url: '/members' })
        }

        await sendWelcome({
            to: creds.email, subject: `Welcome to ${gymName}`, headline: 'Your account is ready', greeting: `Hello ${name},`,
            bodyHtml: linkable
                ? `<p>Your login is now linked to your membership at <strong>${escapeHtml(gymName)}</strong>.</p>`
                : `<p>You have registered with <strong>${escapeHtml(gymName)}</strong>. The gym will review and activate your membership — you will be able to check in once it is approved.</p>`,
            buttonText: 'Sign in to the member portal',
        })
        await sendVerification(creds.email)
        return { success: true, uid: user.uid, pendingApproval: !linkable }
    } catch (err) {
        await adminAuth.deleteUser(user.uid).catch(() => { })
        console.error('member registration failed:', err.message)
        return { error: 'We could not finish creating your account. Nothing was created — please try again.' }
    }
}
