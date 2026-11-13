// Live occupancy and workout demand.
//
// OCCUPANCY  = number of UNIQUE members with an open, non-stale session.
// DEMAND     = per zone, number of unique present members who selected that
//              zone's muscle group for this session.
//
// A member training Chest + Shoulders counts once towards occupancy, once
// towards Chest demand and once towards Shoulders demand. Demand figures are
// never summed to produce occupancy.

import { sessionWorkout } from './schedule.js'

export const DEFAULT_MAX_SESSION_MINUTES = 240

export const DEFAULT_ZONES = [
    { id: 'chest', name: 'Chest', muscleGroup: 'Chest', capacity: null, isActive: true, emoji: '💪', color: '#ef4444' },
    { id: 'back', name: 'Back', muscleGroup: 'Back', capacity: null, isActive: true, emoji: '🏋️', color: '#f97316' },
    { id: 'legs', name: 'Legs', muscleGroup: 'Legs', capacity: null, isActive: true, emoji: '🦵', color: '#22c55e' },
    { id: 'shoulders', name: 'Shoulders', muscleGroup: 'Shoulders', capacity: null, isActive: true, emoji: '🎯', color: '#eab308' },
    { id: 'arms', name: 'Arms', muscleGroup: 'Arms', capacity: null, isActive: true, emoji: '💥', color: '#84cc16' },
    { id: 'core', name: 'Core', muscleGroup: 'Core', capacity: null, isActive: true, emoji: '🧘', color: '#3b82f6' },
]

const SYNONYMS = {
    chest: ['chest', 'push', 'pec'],
    back: ['back', 'pull', 'lats'],
    legs: ['leg', 'legs', 'quad', 'hamstring', 'glute', 'calves', 'lower body'],
    shoulders: ['shoulder', 'shoulders', 'delt'],
    arms: ['arm', 'arms', 'bicep', 'biceps', 'tricep', 'triceps', 'forearm'],
    core: ['core', 'abs', 'abdominal'],
    cardio: ['cardio', 'hiit', 'treadmill', 'running', 'cycling'],
}

export function sessionCheckIn(s) {
    return s?.check_in_time || s?.checkIn || null
}

export function sessionCheckOut(s) {
    return s?.check_out_time || s?.checkOut || null
}

export function sessionMemberId(s) {
    return s?.member_id || s?.memberId || null
}

/** Open = has a check-in, no checkout, and was not marked completed. */
export function isOpenSession(s) {
    if (!s || !sessionCheckIn(s)) return false
    if (sessionCheckOut(s)) return false
    if (String(s.status || '').toLowerCase() === 'completed') return false
    return true
}

/** Stale = open for longer than the gym's maximum session length. */
export function isStaleSession(s, now = new Date(), maxMinutes = DEFAULT_MAX_SESSION_MINUTES) {
    if (!isOpenSession(s)) return false
    const t = new Date(sessionCheckIn(s)).getTime()
    if (isNaN(t)) return true
    return (now.getTime() - t) > maxMinutes * 60000
}

/** Sessions that represent a member physically present right now. */
export function getLiveSessions(sessions, now = new Date(), maxMinutes = DEFAULT_MAX_SESSION_MINUTES) {
    const byMember = new Map()
    for (const s of sessions || []) {
        if (!isOpenSession(s) || isStaleSession(s, now, maxMinutes)) continue
        const t = new Date(sessionCheckIn(s)).getTime()
        if (t > now.getTime() + 5 * 60000) continue // clock-skewed future record
        const key = sessionMemberId(s) || `anon:${s.id}`
        const prev = byMember.get(key)
        if (!prev || new Date(sessionCheckIn(prev)).getTime() < t) byMember.set(key, s)
    }
    return [...byMember.values()]
}

export function countOccupancy(sessions, now = new Date(), maxMinutes = DEFAULT_MAX_SESSION_MINUTES) {
    return getLiveSessions(sessions, now, maxMinutes).length
}

export function workoutMatchesGroup(workoutList, muscleGroup) {
    const mg = String(muscleGroup || '').trim().toLowerCase()
    if (!mg) return false
    const needles = SYNONYMS[mg] || [mg]
    return (workoutList || []).some(w => {
        const item = String(w).toLowerCase()
        return needles.some(n => item === n || item.split(/[^a-z]+/).includes(n))
    })
}

export function sanitizeZones(zones) {
    const list = Array.isArray(zones) && zones.length ? zones : DEFAULT_ZONES
    return list
        .filter(z => z && z.isActive !== false && (z.muscleGroup || z.name))
        .map((z, i) => {
            const cap = parseInt(z.capacity, 10)
            return {
                id: String(z.id || `zone-${i}`),
                name: String(z.name || z.muscleGroup).slice(0, 40),
                muscleGroup: String(z.muscleGroup || z.name).slice(0, 40),
                capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
                emoji: z.emoji || '•',
                color: /^#[0-9a-fA-F]{6}$/.test(z.color || '') ? z.color : '#3b82f6',
            }
        })
}

/**
 * Demand level is only expressed as a percentage when the owner configured a
 * capacity for the zone. Without capacity we report the raw head-count and a
 * neutral label instead of inventing an intensity.
 */
export function demandLevel(count, capacity) {
    if (!capacity) return { percent: null, label: count === 0 ? 'No demand' : `${count} training` }
    const percent = Math.round((count / capacity) * 100)
    let label = 'Quiet'
    if (count === 0) label = 'Quiet'
    else if (percent < 40) label = 'Low'
    else if (percent < 70) label = 'Moderate'
    else if (percent <= 100) label = 'Busy'
    else label = 'Over capacity'
    return { percent, label }
}

export function computeDemand(sessions, zones, now = new Date(), maxMinutes = DEFAULT_MAX_SESSION_MINUTES) {
    const live = getLiveSessions(sessions, now, maxMinutes)
    return sanitizeZones(zones).map(z => {
        const members = live.filter(s => workoutMatchesGroup(sessionWorkout(s), z.muscleGroup)).length
        const { percent, label } = demandLevel(members, z.capacity)
        return { ...z, members, demand: percent, status: label }
    })
}

/** Minutes between check-in and checkout, only when both timestamps are real. */
export function sessionDurationMinutes(s) {
    const a = new Date(sessionCheckIn(s)).getTime()
    const b = new Date(sessionCheckOut(s)).getTime()
    if (isNaN(a) || isNaN(b) || b < a) return null
    const method = String(s.method_out || '').toLowerCase()
    if (method.startsWith('auto')) return null // system-closed sessions have no reliable end time
    return Math.round((b - a) / 60000)
}
