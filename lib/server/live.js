// Live gym state: occupancy, workout demand and today's traffic (server only).
import { adminDb } from '@/lib/firebase/server'
import { getLiveSessions, computeDemand, isStaleSession, isOpenSession, sessionCheckIn, sessionMemberId, DEFAULT_MAX_SESSION_MINUTES } from '@/lib/domain/occupancy'
import { dateKey, hourInTz, addDaysToKey, DEFAULT_TZ } from '@/lib/domain/dates'
import { sessionWorkout } from '@/lib/domain/schedule'

/** Maximum length of a session before it is treated as abandoned. */
export function maxSessionMinutes(settings = {}) {
    if (settings.att_auto_checkout === false) return 14 * 60
    const n = parseInt(settings.att_timeout, 10)
    if (Number.isFinite(n) && n >= 30 && n <= 720) return n
    return DEFAULT_MAX_SESSION_MINUTES
}

export function gymCapacity(settings = {}, gym = {}) {
    const n = parseInt(settings.buildingCapacity ?? gym.capacity, 10)
    return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Attendance documents for a gym since an ISO timestamp.
 * Uses the (gymId, check_in_time) composite index; if that index has not been
 * deployed yet it degrades to a full gym scan so the product keeps working.
 */
export async function queryAttendanceSince(gymId, sinceIso) {
    const col = adminDb.collection('attendance')
    try {
        const snap = await col.where('gymId', '==', gymId).where('check_in_time', '>=', sinceIso).get()
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
        console.warn(`attendance: composite index (gymId, check_in_time) missing — falling back to full scan. Deploy firestore.indexes.json. (${e.code || e.message})`)
        const snap = await col.where('gymId', '==', gymId).get()
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => String(sessionCheckIn(a) || '') >= sinceIso)
    }
}

/** Generic "documents for this gym since X" query with the same graceful index fallback. */
export async function queryGymSince(collection, gymId, field, sinceIso) {
    const col = adminDb.collection(collection)
    try {
        const snap = await col.where('gymId', '==', gymId).where(field, '>=', sinceIso).get()
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
        console.warn(`${collection}: composite index (gymId, ${field}) missing — falling back to full scan. (${e.code || e.message})`)
        const snap = await col.where('gymId', '==', gymId).get()
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => String(a[field] || '') >= sinceIso)
    }
}

/** Open sessions for a gym (small result set; single-field indexes only). */
export async function queryOpenSessions(gymId) {
    const snap = await adminDb.collection('attendance').where('gymId', '==', gymId).where('check_out_time', '==', null).get()
    return snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })).filter(isOpenSession)
}

/** Closes abandoned sessions so they stop counting towards occupancy and demand. */
export async function closeStaleSessions(openSessions, maxMinutes, now = new Date()) {
    const stale = openSessions.filter(s => isStaleSession(s, now, maxMinutes))
    for (let i = 0; i < stale.length; i += 200) {
        const batch = adminDb.batch()
        for (const s of stale.slice(i, i + 200)) {
            batch.update(s.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Auto' })
            const memberId = sessionMemberId(s)
            if (memberId) batch.set(adminDb.collection('members').doc(memberId), { activeSessionId: null }, { merge: true })
        }
        await batch.commit()
    }
    return stale.length
}

/**
 * Snapshot of the gym floor right now.
 *   insideCount — unique members currently checked in
 *   zones       — workout demand per configured facility
 *   live        — the open sessions themselves (owner/trainer views only)
 */
export async function loadLiveState(gymId, { settings = {}, gym = {}, tz = DEFAULT_TZ, closeStale = true } = {}) {
    const now = new Date()
    const maxMinutes = maxSessionMinutes(settings)
    const open = await queryOpenSessions(gymId)
    if (closeStale) {
        try { await closeStaleSessions(open, maxMinutes, now) } catch (e) { console.error('auto-checkout failed:', e.message) }
    }
    const live = getLiveSessions(open, now, maxMinutes)
    const zones = computeDemand(live, settings.widgets, now, maxMinutes)
    return {
        insideCount: live.length,
        capacity: gymCapacity(settings, gym),
        zones,
        live: live.map(s => ({
            id: s.id,
            member_id: sessionMemberId(s),
            member_name: s.member_name || s.members?.name || 'Member',
            member_photo: s.member_photo || null,
            check_in_time: sessionCheckIn(s),
            workout: sessionWorkout(s),
            method: s.method || null,
        })).sort((a, b) => String(b.check_in_time).localeCompare(String(a.check_in_time))),
        maxSessionMinutes: maxMinutes,
        asOf: now.toISOString(),
    }
}

/** Check-ins per hour for today in the gym's timezone (real data only). */
export function hourlyCheckins(sessions, tz, now = new Date()) {
    const today = dateKey(now, tz)
    const counts = new Array(24).fill(0)
    for (const s of sessions) {
        const t = sessionCheckIn(s)
        if (!t || dateKey(t, tz) !== today) continue
        const h = hourInTz(t, tz)
        if (h !== null) counts[h]++
    }
    const currentHour = hourInTz(now, tz)
    const label = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`
    const out = []
    for (let h = 5; h <= 23; h++) out.push({ hour: label(h), v: h <= currentHour ? counts[h] : null })
    return { series: out, total: counts.reduce((a, b) => a + b, 0), counts }
}

/** Unique visitors and total check-ins per day for the last `days` days. */
export function dailyAttendance(sessions, tz, days = 7, now = new Date()) {
    const today = dateKey(now, tz)
    const buckets = new Map()
    for (let i = days - 1; i >= 0; i--) buckets.set(addDaysToKey(today, -i), { checkins: 0, members: new Set() })
    for (const s of sessions) {
        const key = dateKey(sessionCheckIn(s), tz)
        const b = key && buckets.get(key)
        if (!b) continue
        b.checkins++
        const id = sessionMemberId(s)
        if (id) b.members.add(id)
    }
    return [...buckets.entries()].map(([date, b]) => ({
        date,
        day: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        checkins: b.checkins,
        unique: b.members.size,
    }))
}

/** ISO instant for the start of `daysAgo` days before today (gym timezone, approximated to UTC-14h safe margin). */
export function sinceDaysAgo(days, now = new Date()) {
    return new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000).toISOString()
}
