// -----------------------------------------------------------------------
// Server-side session & authorisation.
//
// The session cookie is a Firebase *session cookie* (a signed JWT minted by
// the Admin SDK from a verified ID token). It is verified on every request;
// role and gym are read from the signed custom claims — never from anything
// the browser sends. The legacy cookie name is kept so the middleware and
// existing deployments keep working, but the old unsigned JSON payload is no
// longer accepted.
// -----------------------------------------------------------------------
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth, adminDb } from '@/lib/firebase/server'

export const SESSION_COOKIE = 'gymos_session' // legacy internal identifier, intentionally unchanged
export const ROLE_HOMES = { super_admin: '/super-admin', owner: '/dashboard', trainer: '/trainer', member: '/portal' }
export const ROLES = Object.keys(ROLE_HOMES)

export const SESSION_SHORT_MS = 24 * 60 * 60 * 1000          // 24 hours
export const SESSION_LONG_MS = 14 * 24 * 60 * 60 * 1000      // 14 days (Firebase maximum)

/**
 * Returns the verified session or null. Cached per request so that a page
 * rendering many server actions only verifies the cookie once.
 */
export const getSession = cache(async () => {
    if (!adminAuth) return null
    let raw
    try {
        raw = (await cookies()).get(SESSION_COOKIE)?.value
    } catch {
        return null
    }
    if (!raw || raw.startsWith('{')) return null // legacy unsigned JSON cookies are rejected

    try {
        // checkRevoked=true also rejects disabled/deleted accounts and revoked sessions.
        const decoded = await adminAuth.verifySessionCookie(raw, true)
        const role = decoded.role
        if (!ROLES.includes(role)) return null
        const gymId = role === 'super_admin' ? null : (decoded.gymCode || null)
        if (role !== 'super_admin' && !gymId) return null

        // A valid cookie is not enough: the gym must still exist and be allowed to
        // operate, and a trainer must still be an active trainer of that gym. This
        // makes suspension and removal take effect immediately, not when the cookie expires.
        if (role !== 'super_admin' && adminDb) {
            const gymSnap = await adminDb.collection('gyms').doc(gymId).get()
            if (!gymSnap.exists) return null
            const gymStatus = String(gymSnap.data().status || 'Active').toLowerCase()
            if (gymStatus === 'suspended' || (role === 'owner' && gymStatus === 'pending')) return null
            if (role === 'trainer') {
                const trainer = await loadTrainer(decoded.uid, gymId)
                if (!trainer || String(trainer.data.status || '').toLowerCase() !== 'active') return null
            }
        }
        return {
            uid: decoded.uid,
            role,
            gymId,
            email: (decoded.email || '').toLowerCase(),
            name: decoded.name || decoded.email || '',
            photoURL: decoded.picture || null,
            emailVerified: !!decoded.email_verified,
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
        }
    } catch {
        return null
    }
})

async function loadTrainer(uid, gymId) {
    const direct = await adminDb.collection('trainers').doc(uid).get()
    if (direct.exists && direct.data().gymId === gymId) return { id: direct.id, ref: direct.ref, data: direct.data() }
    const byUid = await adminDb.collection('trainers').where('uid', '==', uid).limit(2).get()
    const match = byUid.docs.find(d => d.data().gymId === gymId)
    return match ? { id: match.id, ref: match.ref, data: match.data() } : null
}

/** For Server Components / read actions: redirects instead of returning. */
export async function requireRole(...roles) {
    const session = await getSession()
    // `expired=1` tells the middleware not to bounce a stale cookie back into the portal;
    // the login page then clears it.
    if (!session) redirect('/login?expired=1')
    if (roles.length && !roles.includes(session.role)) redirect(ROLE_HOMES[session.role] || '/login')
    return session
}

/** For mutations: returns the session, or null when the caller is not allowed. */
export async function authorize(...roles) {
    const session = await getSession()
    if (!session) return null
    if (roles.length && !roles.includes(session.role)) return null
    return session
}

export const UNAUTHORIZED = Object.freeze({ error: 'You are not authorised to perform this action. Please sign in again.' })
export const NO_DB = Object.freeze({ error: 'The server database is not configured.' })

/**
 * Resolves the member document that belongs to the signed-in member.
 * Canonical link is members.authUid == uid (self-registered members also use
 * the uid as document id). A same-gym e-mail match is accepted once and then
 * linked, so owner-created/imported members become the same record.
 */
export const getMemberForSession = cache(async () => {
    const session = await getSession()
    if (!session || session.role !== 'member' || !adminDb) return null

    const direct = await adminDb.collection('members').doc(session.uid).get()
    if (direct.exists && direct.data().gymId === session.gymId) return { id: direct.id, ref: direct.ref, data: direct.data() }

    const byUid = await adminDb.collection('members').where('authUid', '==', session.uid).limit(2).get()
    const uidMatch = byUid.docs.find(d => d.data().gymId === session.gymId)
    if (uidMatch) return { id: uidMatch.id, ref: uidMatch.ref, data: uidMatch.data() }

    if (session.email) {
        const byEmail = await adminDb.collection('members')
            .where('gymId', '==', session.gymId)
            .where('email', '==', session.email)
            .limit(2).get()
        const candidate = byEmail.docs.find(d => !d.data().authUid)
        if (candidate) {
            await candidate.ref.set({ authUid: session.uid }, { merge: true })
            return { id: candidate.id, ref: candidate.ref, data: { ...candidate.data(), authUid: session.uid } }
        }
    }
    return null
})

/** Resolves the trainer document that belongs to the signed-in trainer. */
export const getTrainerForSession = cache(async () => {
    const session = await getSession()
    if (!session || session.role !== 'trainer' || !adminDb) return null

    return loadTrainer(session.uid, session.gymId)
})

/** Loads a document and verifies it belongs to the caller's gym. */
export async function getGymScopedDoc(collection, id, gymId) {
    if (!adminDb || !id || typeof id !== 'string' || id.includes('/')) return null
    const snap = await adminDb.collection(collection).doc(id).get()
    if (!snap.exists) return null
    if (snap.data().gymId !== gymId) return null
    return snap
}

/** Trainer may act on a member only when that member is assigned to them. */
export function isMemberAssignedToTrainer(memberData, trainerId, trainerUid) {
    const tid = memberData?.trainer_id || memberData?.trainerId || memberData?.trainers?.id || null
    return !!tid && (tid === trainerId || tid === trainerUid)
}

/** Strips Firestore class instances so data can cross the server/client boundary. */
export function plain(value) {
    return JSON.parse(JSON.stringify(value, (_k, v) => {
        if (v && typeof v === 'object' && typeof v.toDate === 'function') return v.toDate().toISOString()
        return v
    }))
}

/** Returns the gym's timezone and settings document data. */
export async function getGymContext(gymId) {
    if (!adminDb || !gymId) return { gym: null, settings: {}, tz: 'Asia/Kolkata' }
    const [gymSnap, settingsSnap] = await Promise.all([
        adminDb.collection('gyms').doc(gymId).get(),
        adminDb.collection('gym_settings').doc(gymId).get(),
    ])
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    return {
        gym: gymSnap.exists ? { id: gymSnap.id, ...gymSnap.data() } : null,
        settings,
        tz: settings.timezone || 'Asia/Kolkata',
    }
}

export function gymDisplayName(gym) {
    return gym?.gymName || gym?.name || 'Your Gym'
}

/** Writes an audit record. Never throws: auditing must not break the operation. */
export async function audit(session, action, details = {}) {
    if (!adminDb) return
    try {
        await adminDb.collection('audit_logs').add({
            action,
            gymId: details.gymId ?? session?.gymId ?? null,
            actorUid: session?.uid ?? 'system',
            actorRole: session?.role ?? 'system',
            details,
            timestamp: new Date().toISOString(),
        })
    } catch (e) {
        console.error('audit log failed:', e.message)
    }
}
