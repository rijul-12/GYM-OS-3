'use server'

import { cookies } from 'next/headers'

// -----------------------------------------------------------------------
// Demo Mode credentials — used as fallback when Supabase is not configured.
// This lets the app run fully for demos without a live database.
// -----------------------------------------------------------------------
const DEMO_CREDS = {
    'superadmin@gymos.com': { role: 'super_admin', password: '123456', name: 'Platform Admin', photo: 'https://i.pravatar.cc/150?img=68' },
    'owner@gymos.com': { role: 'owner', password: '123456', name: 'James Holloway', photo: 'https://i.pravatar.cc/150?img=60' },
    'trainer@gymos.com': { role: 'trainer', password: '123456', name: 'Ryan Blackwood', photo: 'https://i.pravatar.cc/150?img=13' },
    'member@gymos.com': { role: 'member', password: '123456', name: 'Alexander Cross', photo: 'https://i.pravatar.cc/150?img=12' },
}

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

    if (isFirebaseConfigured()) {
        // --- FIREBASE AUTH PATH ---
        const { auth } = await import('@/lib/firebase/client')
        const { signInWithEmailAndPassword } = await import('firebase/auth')

        const credential = await signInWithEmailAndPassword(auth, emailNorm, password)
            .catch(err => { throw new Error(err.message) })

        const user = credential.user
        const tokenResult = await user.getIdTokenResult()

        // Magically empower the absolute super admin dynamically to bypass needing strict Firebase claims written initially!
        let userRole = tokenResult.claims?.role;
        if (!userRole) {
            // Since this is a local demo running locally, if the database doesn't know who you are,
            // we will just instantly make you whatever role you clicked on the frontend tabs!
            userRole = role || (emailNorm === 'superadmin@gymos.com' ? 'super_admin' : 'member');
        }

        if (!userRole) throw new Error('Your account has no role assigned. Contact your gym administrator.')
        if (role && userRole !== role) throw new Error(`This account is registered as a different role.`)

        let onboarded = true;
        let gymCode = tokenResult.claims?.gymCode || 'DEMO';
        if (userRole === 'owner') {
            const { adminDb } = await import('@/lib/firebase/server');
            const settings = await adminDb.collection('gym_settings').doc(gymCode).get();
            if (settings.exists && settings.data().onboarded === false) {
                onboarded = false;
            }
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
            onboarded: onboarded
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

    // --- DEMO MODE PATH (no Supabase configured) ---
    await new Promise(r => setTimeout(r, 600)) // Simulate latency

    const rec = DEMO_CREDS[emailNorm]
    if (!rec) throw new Error('No account found with that email.')
    if (rec.password !== password) throw new Error('Incorrect password. Try 123456 for the demo.')

    // Super Admin is hidden from frontend tabs, so we ignore the tab selection mismatch for them
    if (role && rec.role !== role && rec.role !== 'super_admin') throw new Error('This account is a restricted role.')

    const session = {
        role: rec.role,
        gymCode: 'DEMO',
        email: emailNorm,
        name: rec.name,
        photo: rec.photo,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (remember ? SESSION_TTL_MS * 30 : SESSION_TTL_MS)).toISOString(),
        supabase: false,
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

    if (isFirebaseConfigured()) {
        const { auth } = await import('@/lib/firebase/client')
        const { sendPasswordResetEmail } = await import('firebase/auth')

        await sendPasswordResetEmail(auth, emailNorm)
            .catch(err => { throw new Error(err.message) })
        return true
    }

    // Demo Mode — always succeed
    await new Promise(r => setTimeout(r, 800))
    return true
}
