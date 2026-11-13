// Hardware (biometric / turnstile) attendance bridge — server only.
//
// Devices authenticate with a per-gym integration secret that the owner
// generates in Integrations. Only the SHA-256 hash of the secret is stored.
import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/server'
import { isOpenSession, sessionCheckIn } from '@/lib/domain/occupancy'
import { getEffectiveStatus, MEMBER_STATUS } from '@/lib/domain/membership'
import { getPlannedWorkout } from '@/lib/domain/schedule'
import { weekdayInTz } from '@/lib/domain/dates'

export const hashSecret = (secret) => crypto.createHash('sha256').update(String(secret)).digest('hex')

/** Returns the gym id the secret belongs to, or null. */
export async function authenticateDevice(secret) {
    if (!adminDb || !secret || String(secret).length < 24) return null
    const snap = await adminDb.collection('gym_api_settings')
        .where('secret_hash', '==', hashSecret(secret)).where('is_active', '==', true).limit(1).get()
    return snap.empty ? null : snap.docs[0].id
}

/**
 * Records a punch from a device. A punch while a session is open closes it
 * (after a 60s debounce); otherwise it opens a new session.
 */
export async function recordHardwarePunch({ gymId, biometricUserId, at, device, method = 'Hardware' }) {
    const when = new Date(at)
    if (isNaN(when.getTime())) return { error: 'Invalid timestamp' }
    // Reject punches that are far in the future or older than two days.
    if (when.getTime() > Date.now() + 10 * 60000 || when.getTime() < Date.now() - 48 * 3600000) return { error: 'Timestamp out of range' }
    const bioId = String(biometricUserId || '').trim()
    if (!bioId || bioId.length > 64) return { error: 'Invalid user id' }

    const q = await adminDb.collection('members').where('gymId', '==', gymId).where('biometric_id', '==', bioId).limit(1).get()
    if (q.empty) return { error: 'Member mapping not found' }
    const memberRef = q.docs[0].ref

    const settingsSnap = await adminDb.collection('gym_settings').doc(gymId).get()
    const tz = settingsSnap.exists ? (settingsSnap.data().timezone || 'Asia/Kolkata') : 'Asia/Kolkata'

    return adminDb.runTransaction(async (t) => {
        const mSnap = await t.get(memberRef)
        const m = mSnap.data()
        const openSnap = await t.get(adminDb.collection('attendance').where('member_id', '==', memberRef.id).where('check_out_time', '==', null))
        const open = openSnap.docs.filter(d => isOpenSession(d.data()))
        if (open.length > 0) {
            const first = open[0]
            const diff = when.getTime() - new Date(sessionCheckIn(first.data())).getTime()
            if (diff <= 60000) return { success: true, action: 'ignored-bounce' }
            open.forEach(d => t.update(d.ref, { check_out_time: when.toISOString(), status: 'Completed', method_out: method }))
            t.update(memberRef, { activeSessionId: null })
            return { success: true, action: 'check-out' }
        }
        if (getEffectiveStatus(m, when, tz) !== MEMBER_STATUS.ACTIVE) return { error: 'Membership not active' }
        const planned = getPlannedWorkout(m, weekdayInTz(when, tz))
        const ref = adminDb.collection('attendance').doc()
        t.set(ref, {
            member_id: memberRef.id, member_name: m.name || 'Member', member_photo: m.photoURL || null,
            gymId, check_in_time: when.toISOString(), check_out_time: null,
            method, device: String(device || '').slice(0, 80) || null, status: 'Active',
            actual_workout: planned, planned_workout: planned,
        })
        t.update(memberRef, { activeSessionId: ref.id, lastCheckInAt: when.toISOString() })
        return { success: true, action: 'check-in' }
    })
}
