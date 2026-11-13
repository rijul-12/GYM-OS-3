'use server'

import { revalidatePath } from 'next/cache'
import { adminDb, adminAuth, missingFirebaseEnv } from '@/lib/firebase/server'
import { authorize, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { getPlatformPricing } from '@/lib/server/pricing'
import { razorpayConfigStatus } from '@/lib/server/payments'
import { getEmailConfigStatus } from '@/lib/email'
import { notify } from '@/lib/server/notify'

// All actions in this file are Super Admin only.

/** Gym owners with the state of their login. */
export async function getOwners() {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []
    const gymsSnap = await adminDb.collection('gyms').get()
    const owners = await Promise.all(gymsSnap.docs.map(async (d) => {
        const g = d.data()
        let auth = null
        if (g.ownerUid) { try { auth = await adminAuth.getUser(g.ownerUid) } catch { auth = null } }
        return {
            gymId: d.id, gymName: g.gymName || g.name || d.id, name: g.ownerName || '', email: g.email || g.ownerEmail || '', phone: g.phone || '',
            gymStatus: g.status || 'Active', hasLogin: !!auth, disabled: !!auth?.disabled, emailVerified: !!auth?.emailVerified,
            lastSignIn: auth?.metadata?.lastSignInTime ? new Date(auth.metadata.lastSignInTime).toISOString() : null,
            createdAt: g.createdAt || null,
        }
    }))
    return plain(owners.sort((a, b) => a.gymName.localeCompare(b.gymName)))
}

export async function getAuditLogs(limit = 200) {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []
    const snap = await adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500)).get()
    return plain(snap.docs.map(d => {
        const a = d.data()
        let detail = ''
        try { detail = JSON.stringify(a.details || {}).slice(0, 300) } catch { }
        return { id: d.id, action: a.action || '', gymId: a.gymId || null, actorRole: a.actorRole || 'system', actorUid: a.actorUid || '', timestamp: a.timestamp || null, detail }
    }))
}

export async function getFeedback() {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []
    const snap = await adminDb.collection('gym_feedback').orderBy('timestamp', 'desc').limit(200).get()
    return plain(snap.docs.map(d => {
        const f = d.data()
        return { id: d.id, text: f.text || '', category: f.category || 'Feedback', role: f.role || '', email: f.email || '', gymCode: f.gymCode || null, page: f.page || '', timestamp: f.timestamp || null, status: f.status || 'unresolved' }
    }))
}

export async function setFeedbackStatus(id, status) {
    const session = await authorize('super_admin')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (!['resolved', 'unresolved'].includes(status) || typeof id !== 'string' || !id || id.includes('/')) return { error: 'Invalid request.' }
    const ref = adminDb.collection('gym_feedback').doc(id)
    if (!(await ref.get()).exists) return { error: 'Not found.' }
    await ref.update({ status, resolvedBy: status === 'resolved' ? session.uid : null, resolvedAt: status === 'resolved' ? new Date().toISOString() : null })
    revalidatePath('/super-admin/support')
    return { success: true }
}

/** Which integrations are configured. Reports variable NAMES only, never values. */
export async function getPlatformHealth() {
    const session = await authorize('super_admin')
    if (!session) return null
    const checks = []
    const fbMissing = missingFirebaseEnv()
    let dbOk = false, dbError = null
    if (adminDb) { try { await adminDb.collection('gyms').limit(1).get(); dbOk = true } catch (e) { dbError = e.code || e.message } }
    checks.push({ name: 'Firebase Admin (Auth + Firestore)', ok: dbOk, detail: dbOk ? 'Connected' : (fbMissing.length ? `Missing: ${fbMissing.join(', ')}` : `Query failed: ${dbError}`) })

    const clientMissing = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'].filter(k => !process.env[k])
    checks.push({ name: 'Firebase client (sign-in)', ok: clientMissing.length === 0, detail: clientMissing.length ? `Missing: ${clientMissing.join(', ')}` : 'Configured' })
    checks.push({ name: 'Firebase Storage (profile photos)', ok: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, detail: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Bucket configured' : 'Missing: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' })

    const email = getEmailConfigStatus()
    checks.push({ name: 'E-mail', ok: email.configured, detail: email.configured ? `Provider: ${email.provider}` : `Missing: ${email.missing.join(', ')}` })

    const rzp = razorpayConfigStatus()
    checks.push({ name: 'Razorpay checkout', ok: rzp.configured, detail: rzp.configured ? 'Keys configured' : `Missing: ${rzp.missing.join(', ')}` })
    checks.push({ name: 'Razorpay webhook', ok: !!process.env.RAZORPAY_WEBHOOK_SECRET, detail: process.env.RAZORPAY_WEBHOOK_SECRET ? 'Secret configured' : 'Missing: RAZORPAY_WEBHOOK_SECRET' })

    const smsMissing = []
    if (!process.env.TWILIO_ACCOUNT_SID) smsMissing.push('TWILIO_ACCOUNT_SID')
    if (!process.env.TWILIO_AUTH_TOKEN) smsMissing.push('TWILIO_AUTH_TOKEN')
    if (!process.env.TWILIO_PHONE_NUMBER && !process.env.TWILIO_MESSAGING_SERVICE_SID) smsMissing.push('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER')
    checks.push({ name: 'SMS (Twilio)', ok: smsMissing.length === 0, detail: smsMissing.length ? `Missing: ${smsMissing.join(', ')}` : 'Credentials configured (India needs DLT-registered sender)' })

    checks.push({ name: 'Daily cron (reminders, auto check-out)', ok: !!process.env.CRON_SECRET, detail: process.env.CRON_SECRET ? 'CRON_SECRET configured' : 'Missing: CRON_SECRET' })
    checks.push({ name: 'Auth deletion webhook', ok: !!process.env.FIREBASE_WEBHOOK_SECRET, detail: process.env.FIREBASE_WEBHOOK_SECRET ? 'Secret configured (requires the Cloud Function to be deployed)' : 'Missing: FIREBASE_WEBHOOK_SECRET' })
    checks.push({ name: 'Public URL for e-mail links', ok: true, detail: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'Default: https://gymos.app' })
    return { checks, checkedAt: new Date().toISOString() }
}

export async function getPricingSettings() {
    const session = await authorize('super_admin')
    if (!session) return null
    return plain(await getPlatformPricing())
}

export async function savePricingSettings(input = {}) {
    const session = await authorize('super_admin')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null }
    const patch = { BASE_PLATFORM_FEE: num(input.BASE_PLATFORM_FEE, 0, 1000000), ACTIVE_MEMBER_RATE: num(input.ACTIVE_MEMBER_RATE, 0, 10000), REGISTRATION_FEE: num(input.REGISTRATION_FEE, 0, 1000000) }
    if (Object.values(patch).some(v => v === null)) return { error: 'Enter valid amounts.' }
    const before = await getPlatformPricing()
    await adminDb.collection('platform_settings').doc('pricing').set({ ...patch, updatedAt: new Date().toISOString(), updatedBy: session.uid }, { merge: true })
    await audit(session, 'PLATFORM_PRICING_CHANGED', { before: { BASE_PLATFORM_FEE: before.BASE_PLATFORM_FEE, ACTIVE_MEMBER_RATE: before.ACTIVE_MEMBER_RATE, REGISTRATION_FEE: before.REGISTRATION_FEE }, after: patch })
    return { success: true }
}

/** Send an in-app announcement to the owners of one gym or of every active gym. */
export async function sendOwnerAnnouncement({ title, message, gymId = null } = {}) {
    const session = await authorize('super_admin')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const t = String(title || '').trim().slice(0, 120)
    const m = String(message || '').trim().slice(0, 500)
    if (t.length < 3 || m.length < 3) return { error: 'Enter a title and a message.' }

    let targets = []
    if (gymId) {
        const g = await adminDb.collection('gyms').doc(String(gymId)).get()
        if (!g.exists) return { error: 'Gym not found.' }
        targets = [g.id]
    } else {
        targets = (await adminDb.collection('gyms').where('status', '==', 'Active').get()).docs.map(d => d.id)
    }
    let sent = 0
    for (const id of targets) if (await notify({ gymId: id, targetRole: 'owner', title: t, message: m })) sent++
    await adminDb.collection('platform_announcements').add({ title: t, message: m, gymId: gymId || null, recipients: sent, sentBy: session.uid, sentAt: new Date().toISOString() })
    await audit(session, 'OWNER_ANNOUNCEMENT_SENT', { recipients: sent, gymId: gymId || null })
    revalidatePath('/super-admin/notifications')
    return { success: true, recipients: sent }
}

export async function getAnnouncements() {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []
    const snap = await adminDb.collection('platform_announcements').orderBy('sentAt', 'desc').limit(50).get()
    return plain(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}
