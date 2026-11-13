'use server'

import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, audit, UNAUTHORIZED, NO_DB } from '@/lib/server/session'
import { hashSecret } from '@/lib/server/hardware'

const APPEARANCE = {
    theme: ['system', 'light', 'dark'],
    accent: null, density: ['comfortable', 'compact'], sidebar: ['expanded', 'collapsed'],
    animations: ['enabled', 'reduced', 'disabled'], language: null,
}

/** The caller's own appearance preferences. */
export async function getUserAppearance() {
    const session = await getSession()
    if (!session || !adminDb) return null
    const doc = await adminDb.collection('user_settings').doc(session.uid).get()
    return doc.exists ? JSON.parse(JSON.stringify(doc.data())) : null
}

/** Saves appearance preferences for the signed-in user only. */
export async function updateUserAppearance(_unused, settings = {}) {
    const session = await getSession()
    if (!session) return false
    if (!adminDb) return false
    const clean = {}
    for (const [key, allowed] of Object.entries(APPEARANCE)) {
        if (!(key in settings)) continue
        const v = String(settings[key]).slice(0, 24)
        if (!allowed || allowed.includes(v)) clean[key] = v
    }
    if (Object.keys(clean).length === 0) return false
    await adminDb.collection('user_settings').doc(session.uid).set({ ...clean, updated_at: new Date().toISOString() }, { merge: true })
    return true
}

/** Owner: state of the hardware attendance integration (never returns the secret). */
export async function getIntegrationStatus() {
    const session = await authorize('owner')
    if (!session || !adminDb) return { enabled: false }
    const doc = await adminDb.collection('gym_api_settings').doc(session.gymId).get()
    if (!doc.exists || !doc.data().secret_hash) return { enabled: false }
    const d = doc.data()
    return { enabled: d.is_active !== false, createdAt: d.secret_created_at || null, hint: d.secret_hint || null }
}

/**
 * Owner: create or rotate the integration secret used by attendance hardware.
 * The secret is shown once and only its hash is stored.
 */
export async function rotateIntegrationSecret() {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const secret = 'bgm_' + crypto.randomBytes(32).toString('base64url')
    await adminDb.collection('gym_api_settings').doc(session.gymId).set({
        gymId: session.gymId, secret_hash: hashSecret(secret), secret_hint: secret.slice(-4),
        secret_created_at: new Date().toISOString(), is_active: true,
    }, { merge: true })
    await audit(session, 'INTEGRATION_SECRET_ROTATED', {})
    return { success: true, secret }
}

export async function disableIntegration() {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    await adminDb.collection('gym_api_settings').doc(session.gymId).set({ is_active: false, secret_hash: null, secret_hint: null }, { merge: true })
    await audit(session, 'INTEGRATION_DISABLED', {})
    return { success: true }
}
