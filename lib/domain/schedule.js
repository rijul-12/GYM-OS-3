// Workout schedule normalisation.
//
// Canonical shape stored on a member:
//   noFixedSchedule: boolean
//   schedule: { Monday: ['Chest','Shoulders'], Tuesday: [], ... }   (empty array = rest day)
//
// Legacy documents used `weeklySchedule`, short day keys ("Mon"), comma separated
// strings and the literal string "Flexible". Everything is read through here.

import { DAY_NAMES } from './dates.js'

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
export const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const REST_WORDS = new Set(['rest', 'off', 'none', '-', 'n/a', 'na', ''])

function dayFromKey(key) {
    const k = String(key || '').trim().toLowerCase().slice(0, 3)
    return DAY_NAMES.find(d => d.toLowerCase().startsWith(k)) || null
}

function titleCase(s) {
    return s.replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
}

/** Turns any stored value for one day into a clean, de-duplicated list of groups. */
export function normalizeDayEntry(value) {
    if (value === null || value === undefined) return []
    let parts = []
    if (Array.isArray(value)) parts = value
    else if (typeof value === 'string') parts = value.split(/[,+&/|]| and /i)
    else return []

    const seen = new Set()
    const out = []
    for (const p of parts) {
        if (typeof p !== 'string') continue
        const clean = titleCase(p).slice(0, 40)
        if (REST_WORDS.has(clean.toLowerCase())) continue
        const key = clean.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(clean)
    }
    return out.slice(0, 8)
}

export function emptySchedule() {
    return Object.fromEntries(WEEK_ORDER.map(d => [d, []]))
}

export function normalizeSchedule(input) {
    const out = emptySchedule()
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out
    for (const [k, v] of Object.entries(input)) {
        const day = dayFromKey(k)
        if (day) out[day] = normalizeDayEntry(v)
    }
    return out
}

export function getMemberSchedule(member) {
    if (!member) return { noFixedSchedule: true, schedule: emptySchedule() }
    const raw = (member.schedule && typeof member.schedule === 'object') ? member.schedule
        : (member.weeklySchedule && typeof member.weeklySchedule === 'object') ? member.weeklySchedule
            : null
    const flagged = member.noFixedSchedule === true || member.schedule === 'Flexible'
    if (flagged || !raw) return { noFixedSchedule: true, schedule: emptySchedule() }
    return { noFixedSchedule: false, schedule: normalizeSchedule(raw) }
}

/** Muscle groups planned for the given weekday name ("Monday"). */
export function getPlannedWorkout(member, weekday) {
    const { noFixedSchedule, schedule } = getMemberSchedule(member)
    if (noFixedSchedule) return []
    return schedule[weekday] || []
}

/** Normalises whatever was stored as a session's workout into a list of groups. */
export function sessionWorkout(session) {
    if (!session) return []
    const actual = normalizeDayEntry(session.actual_workout)
    if (actual.length) return actual
    return normalizeDayEntry(session.planned_workout)
}
