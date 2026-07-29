'use server'

import { cookies } from 'next/headers'

const GYMOS_COOKIE = 'gymos_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

/** Check if Firebase env vars are present and valid. */
function isFirebaseConfigured() {
    return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
}

// -----------------------------------------------------------------------
// Login Action
// Tries Supabase first; falls back to Demo Mode if not configured.
// Writes the gymos_session cookie for the middleware RBAC layer.
// -----------------------------------------------------------------------
export async function loginAction({ email, password, role, remember }) {
    const emailNorm = email?.toLowerCase()?.trim()

    if (!isFirebaseConfigured()) return { error: 'Production identity services unavailable. Check environment keys.' }

    // --- FIREBASE AUTH PATH ---
    const { auth } = await import('@/lib/firebase/client')
    const { signInWithEmailAndPassword } = await import('firebase/auth')

    let credential;
    try {
        credential = await signInWithEmailAndPassword(auth, emailNorm, password)
    } catch (err) {
        return { error: 'Invalid credentials. Please verify your email and password.' }
    }

    const user = credential.user
    const tokenResult = await user.getIdTokenResult()

    let userRole = tokenResult.claims?.role;

    if (!userRole) return { error: 'Your account has no role assigned. Contact your gym administrator.' }

    // Super Admins override UI tab bindings
    if (userRole !== 'super_admin' && role && userRole !== role) {
        return { error: 'This account is registered as a different role.' }
    }

    let onboarded = true;
    let gymCode = tokenResult.claims?.gymCode || 'DEMO';
    let subStatus = { isReadOnly: false, currentPhase: 'Active', daysRemaining: 999 };

    if (userRole === 'owner') {
        const { adminDb } = await import('@/lib/firebase/server');

        // Check Gym Approval Status (Step 7)
        const gymSnap = await adminDb.collection('gyms').doc(gymCode).get();
        if (gymSnap.exists && gymSnap.data().status === 'Pending') {
            const { signOut } = await import('firebase/auth');
            if (auth) await signOut(auth)
            return { error: 'Your gym registration is pending Super Admin approval. We will notify you once verified.' }
        }

        const settings = await adminDb.collection('gym_settings').doc(gymCode).get();
        if (settings.exists && settings.data().onboarded === false) {
            onboarded = false;
        }
    }

    if (userRole === 'trainer') {
        const { adminDb } = await import('@/lib/firebase/server');
        if (adminDb) {
            const trainerSnap = await adminDb.collection('trainers').doc(user.uid).get();
            if (trainerSnap.exists && trainerSnap.data().status === 'Pending') {
                const { signOut } = await import('firebase/auth');
                if (auth) await signOut(auth)
                return { error: 'Your trainer profile is pending Gym Owner approval.' }
            }
        }
    }

    // Compute strict subscription boundaries
    if (userRole === 'owner' || userRole === 'trainer' || userRole === 'super_admin') {
        const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
        subStatus = await getSubscriptionStatus(gymCode);
    }

    const session = {
        role: userRole,
        gymCode: gymCode,
        email: emailNorm,
        name: user.displayName ?? emailNorm,
        photo: user.photoURL ?? `https://i.pravatar.cc/150?u=${emailNorm}`,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (remember ? SESSION_TTL_MS * 30 : SESSION_TTL_MS)).toISOString(),
        firebase: true, // Flag that this is a real Firebase session
        onboarded: onboarded,
        readOnly: subStatus.isReadOnly,
        subscriptionPhase: subStatus.currentPhase,
        daysRemaining: subStatus.daysRemaining
    }

    const cookieStore = await cookies()
    cookieStore.set(GYMOS_COOKIE, JSON.stringify(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(session.expiresAt),
    })

    return session
}
// -----------------------------------------------------------------------
// Logout Action
// -----------------------------------------------------------------------
export async function logoutAction() {
    if (isFirebaseConfigured()) {
        const { auth } = await import('@/lib/firebase/client')
        const { signOut } = await import('firebase/auth')
        if (auth) await signOut(auth)
    }

    const cookieStore = await cookies()
    cookieStore.delete(GYMOS_COOKIE)
    cookieStore.delete('gymos_impersonate')
    return true
}

// -----------------------------------------------------------------------
// Forgot Password Action
// -----------------------------------------------------------------------
export async function resetPasswordAction(email) {
    const emailNorm = email?.toLowerCase()?.trim()

    if (!isFirebaseConfigured()) return { error: 'Production identity services unavailable' }

    const { auth } = await import('@/lib/firebase/client')
    const { sendPasswordResetEmail } = await import('firebase/auth')

    await sendPasswordResetEmail(auth, emailNorm)
        .catch(err => { throw new Error(err.message) })
    return true
}
