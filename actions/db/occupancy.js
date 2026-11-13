'use server'

import { adminDb } from '@/lib/firebase/server'
import { requireRole, getGymContext, plain } from '@/lib/server/session'
import { loadLiveState, queryAttendanceSince, hourlyCheckins, sinceDaysAgo } from '@/lib/server/live'

/** Owner: who is on the floor right now and what they are training. */
export async function getOccupancyStats() {
    const session = await requireRole('owner')
    const empty = { insideCount: 0, capacity: null, zones: [], live: [], hourly: [], todayCheckins: 0, maxSessionMinutes: null, asOf: null }
    if (!adminDb) return empty
    const { gym, settings, tz } = await getGymContext(session.gymId)
    const now = new Date()
    const [live, recent] = await Promise.all([
        loadLiveState(session.gymId, { settings, gym, tz }),
        queryAttendanceSince(session.gymId, sinceDaysAgo(1, now)),
    ])
    const hourly = hourlyCheckins(recent, tz, now)
    return plain({ ...live, hourly: hourly.series, todayCheckins: hourly.total })
}
