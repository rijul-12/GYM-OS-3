'use server'

import { cookies } from 'next/headers'
import { adminAuth, adminDb, isFirebaseConfigured, missingFirebaseEnv } from '@/lib/firebase/server'
import { SESSION_COOKIE, SESSION_LONG_MS, SESSION_SHORT_MS, getSession } from '@/lib/server/session'

const LEGACY_IMPERSONATE_COOKIE = 'gymos_impersonate'

function notConfiguredError() {
    const missing = missingFirebaseEnv()
    return { error: `Sign-in is unavailable: the server is not configured${missing.length ? ` (missing ${missing.join(', ')})` : ''}.` }
}

/** Builds the non-sensitive session summary the UI needs. Authorisation never relies on it. */
async function buildClientSession(base) {
    const session = {
        uid: base.uid,
        role: base.role,
        gymCode: base.gymId || null,
        email: base.email,
        name: base.name || base.email,
        photoURL: base.photoURL || null,
        photo: base.photoURL || null,
        emailVerified: !!base.emailVerified,
        expiresAt: base.expiresAt,
        onboarded: true,
        readOnly: false,
        subscriptionPhase: 'Active',
        daysRemaining: null,
        memberLimit: null,
        gymName: null,
        memberId: null,
        appearance: null,
    }
    if (!adminDb) return session

    try {
        const appearanceSnap = await adminDb.collection('user_settings').doc(base.uid).get()
        if (appearanceSnap.exists) session.appearance = JSON.parse(JSON.stringify(appearanceSnap.data()))
    } catch { }

    if (base.role !== 'super_admin' && base.gymId) {
        try {
            const [gymSnap, settingsSnap] = await Promise.all([
                adminDb.collection('gyms').doc(base.gymId).get(),
                adminDb.collection('gym_settings').doc(base.gymId).get(),
            ])
            if (gymSnap.exists) session.gymName = gymSnap.data().gymName || gymSnap.data().name || null
            if (base.role === 'owner' && settingsSnap.exists && settingsSnap.data().onboarded === false) session.onboarded = false
        } catch { }

        if (base.role === 'owner' || base.role === 'trainer') {
            try {
                const { getSubscriptionStatus } = await import('@/actions/db/subscriptions')
                const sub = await getSubscriptionStatus()
                if (sub) {
                    session.readOnly = !!sub.isReadOnly
                    session.subscriptionPhase = sub.currentPhase
                    session.daysRemaining = sub.daysRemaining
                    session.memberLimit = sub.memberLimit
                }
            } catch { }
        }
    }

    // The canonical profile photo lives on the profile document.
    try {
        if (base.role === 'member') {
            const direct = await adminDb.collection('members').doc(base.uid).get()
            let doc = direct.exists ? direct : null
            if (!doc) {
                const q = await adminDb.collection('members').where('authUid', '==', base.uid).limit(1).get()
                doc = q.empty ? null : q.docs[0]
            }
            if (doc) {
                session.memberId = doc.id
                session.name = doc.data().name || session.name
                session.photoURL = doc.data().photoURL || session.photoURL
            }
        } else if (base.role === 'trainer') {
            const direct = await adminDb.collection('trainers').doc(base.uid).get()
            let doc = direct.exists ? direct : null
            if (!doc) {
                const q = await adminDb.collection('trainers').where('uid', '==', base.uid).limit(1).get()
                doc = q.empty ? null : q.docs[0]
            }
            if (doc) {
                session.name = doc.data().name || session.name
                session.photoURL = doc.data().photoURL || session.photoURL
            }
        } else {
            const userSnap = await adminDb.collection('users').doc(base.uid).get()
            if (userSnap.exists) {
                session.name = userSnap.data().name || session.name
                session.photoURL = userSnap.data().photoURL || session.photoURL
            }
        }
    } catch { }
    session.photo = session.photoURL
    return session
}

// -----------------------------------------------------------------------
// Session creation.
// The browser signs in with the Firebase client SDK and sends the resulting
// ID token here. The token is verified with the Admin SDK and exchanged for
// an httpOnly, signed Firebase session cookie.
// -----------------------------------------------------------------------
export async function createSessionAction({ idToken, role, remember } = {}) {
    if (!isFirebaseConfigured()) return notConfiguredError()
    if (!idToken || typeof idToken !== 'string') return { error: 'Missing credentials.' }

    let decoded
    try {
        decoded = await adminAuth.verifyIdToken(idToken, true)
    } catch {
        return { error: 'Your sign-in could not be verified. Please try again.' }
    }

    // Only accept a fresh sign-in, so a stolen long-lived ID token cannot mint sessions.
    if ((Date.now() / 1000) - decoded.auth_time > 5 * 60) {
        return { error: 'Your sign-in has expired. Please sign in again.' }
    }

    const userRole = decoded.role
    if (!userRole) return { error: 'Your account has no role assigned. Contact your gym administrator.' }
    if (userRole !== 'super_admin' && role && userRole !== role) {
        return { error: 'This account is registered under a different role. Go back and pick the correct role.' }
    }

    const gymId = userRole === 'super_admin' ? null : decoded.gymCode
    if (userRole !== 'super_admin' && !gymId) return { error: 'Your account is not linked to a gym. Contact support.' }

    if (userRole !== 'super_admin') {
        const gymSnap = await adminDb.collection('gyms').doc(gymId).get()
        if (!gymSnap.exists) return { error: 'Your gym could not be found. It may have been removed.' }
        const gymStatus = String(gymSnap.data().status || 'Active').toLowerCase()
        if (userRole === 'owner' && gymStatus === 'pending') {
            return { error: 'Your gym registration is pending approval. We will notify you once it is verified.' }
        }
        if (gymStatus === 'suspended') {
            return { error: 'This gym is currently suspended. Please contact BGM support.' }
        }
    }

    if (userRole === 'trainer') {
        let trainerSnap = await adminDb.collection('trainers').doc(decoded.uid).get()
        if (!trainerSnap.exists) {
            const q = await adminDb.collection('trainers').where('uid', '==', decoded.uid).limit(1).get()
            trainerSnap = q.empty ? null : q.docs[0]
        }
        const tStatus = String(trainerSnap?.data()?.status || '').toLowerCase()
        if (!trainerSnap) return { error: 'Your trainer profile could not be found. Contact your gym owner.' }
        if (tStatus === 'pending') return { error: 'Your trainer profile is pending approval by the gym owner.' }
        if (tStatus === 'suspended') return { error: 'Your trainer account has been suspended by the gym owner.' }
    }

    const expiresIn = remember ? SESSION_LONG_MS : SESSION_SHORT_MS
    let sessionCookie
    try {
        sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })
    } catch {
        return { error: 'Could not start your session. Please sign in again.' }
    }

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(expiresIn / 1000),
    })
    cookieStore.delete(LEGACY_IMPERSONATE_COOKIE)

    return buildClientSession({
        uid: decoded.uid,
        role: userRole,
        gymId,
        email: (decoded.email || '').toLowerCase(),
        name: decoded.name,
        photoURL: decoded.picture || null,
        emailVerified: !!decoded.email_verified,
        expiresAt: new Date(Date.now() + expiresIn).toISOString(),
    })
}

/** Returns the verified session summary for the UI, or null when signed out. */
export async function getSessionAction() {
    const session = await getSession()
    if (!session) return null
    return buildClientSession(session)
}

/** Clears the server session. The browser additionally calls Firebase signOut(). */
export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    cookieStore.delete(LEGACY_IMPERSONATE_COOKIE)
    return true
}

// -----------------------------------------------------------------------
// Password reset — always answers the same way so the form cannot be used to
// discover which e-mail addresses have accounts.
// -----------------------------------------------------------------------
export async function resetPasswordAction(email) {
    const emailNorm = String(email || '').toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailNorm)) return { error: 'Please enter a valid e-mail address.' }
    if (!isFirebaseConfigured()) return notConfiguredError()

    const { sendEmail, getEmailConfigStatus } = await import('@/lib/email')
    const status = getEmailConfigStatus()
    if (!status.configured) {
        return { error: `Password reset e-mails cannot be sent yet: e-mail is not configured (missing ${status.missing.join(', ')}).` }
    }

    try {
        const link = await adminAuth.generatePasswordResetLink(emailNorm)
        const { toAppActionUrl } = await import('@/lib/url-builder')
        const result = await sendEmail({
            to: emailNorm,
            subject: 'Reset your BGM password',
            headline: 'Reset your password',
            greeting: 'We received a request to reset your password.',
            bodyHtml: '<p>Use the button below to choose a new password. The link expires in one hour. If you did not request this, you can safely ignore this e-mail.</p>',
            button: { text: 'Choose a new password', url: toAppActionUrl(link, '/reset-password') },
        })
        if (!result.success) return { error: 'We could not send the reset e-mail. Please try again later.' }
    } catch (err) {
        // auth/user-not-found (and similar) intentionally fall through to the generic success.
        if (err?.code && err.code !== 'auth/user-not-found' && err.code !== 'auth/email-not-found') {
            console.error('password reset failed:', err.code)
        }
    }
    return { success: true }
}

/** Sends (or re-sends) the e-mail verification link to the signed-in user. */
export async function sendVerificationEmailAction() {
    const session = await getSession()
    if (!session) return { error: 'Please sign in first.' }
    if (session.emailVerified) return { success: true, alreadyVerified: true }
    return sendVerificationEmail(session.email)
}

async function sendVerificationEmail(email) {
    const { sendEmail } = await import('@/lib/email')
    const { toAppActionUrl } = await import('@/lib/url-builder')
    try {
        const link = await adminAuth.generateEmailVerificationLink(email)
        const result = await sendEmail({
            to: email,
            subject: 'Verify your BGM e-mail address',
            headline: 'Confirm your e-mail',
            bodyHtml: '<p>Please confirm that this e-mail address belongs to you.</p>',
            button: { text: 'Verify e-mail', url: toAppActionUrl(link, '/verify-email') },
        })
        return result.success ? { success: true } : { error: result.error }
    } catch (err) {
        return { error: 'Could not create a verification link.' }
    }
}
