'use server'

import { adminDb } from '@/lib/firebase/server'
import { authorize, getMemberForSession, getGymContext, plain } from '@/lib/server/session'
import { queryAttendanceSince, sinceDaysAgo, loadLiveState } from '@/lib/server/live'
import { dateKey, hourInTz, weekdayInTz, addDaysToKey } from '@/lib/domain/dates'
import { sessionCheckIn, sessionDurationMinutes } from '@/lib/domain/occupancy'
import { sessionWorkout, getPlannedWorkout } from '@/lib/domain/schedule'
import { getEffectiveStatus, daysUntilExpiry, getOutstanding } from '@/lib/domain/membership'

const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`

/**
 * GymAI for members.
 *
 * Every statement is derived from stored records the member is entitled to:
 * their own attendance and membership, plus anonymous gym-wide check-in counts.
 * No generative model is involved, so nothing can be invented; when there is
 * not enough data an insight is simply omitted.
 */
export async function getMemberInsights() {
    const session = await authorize('member')
    if (!session || !adminDb) return { available: false, insights: [] }
    const member = await getMemberForSession()
    if (!member) return { available: false, insights: [] }

    const { gym, settings, tz } = await getGymContext(session.gymId)
    const now = new Date()
    const today = dateKey(now, tz)
    const [mineSnap, gymRecent, live] = await Promise.all([
        adminDb.collection('attendance').where('member_id', '==', member.id).get(),
        queryAttendanceSince(session.gymId, sinceDaysAgo(28, now)),
        loadLiveState(session.gymId, { settings, gym, tz, closeStale: false }),
    ])
    const mine = mineSnap.docs.map(d => d.data()).filter(a => a.gymId === session.gymId && sessionCheckIn(a))
    const since30 = addDaysToKey(today, -29)
    const last30 = mine.filter(a => dateKey(sessionCheckIn(a), tz) >= since30)
    const insights = []

    // Consistency
    const days30 = new Set(last30.map(a => dateKey(sessionCheckIn(a), tz)))
    insights.push({
        id: 'visits', title: `${days30.size} visit${days30.size === 1 ? '' : 's'} in the last 30 days`,
        detail: days30.size === 0 ? 'No check-ins recorded in the last 30 days.' : `That is about ${(days30.size / 4.3).toFixed(1)} per week.`,
        basis: 'Your check-ins',
    })

    // Current streak (consecutive days ending today or yesterday)
    const allDays = new Set(mine.map(a => dateKey(sessionCheckIn(a), tz)))
    let cursor = allDays.has(today) ? today : addDaysToKey(today, -1)
    let streak = 0
    while (allDays.has(cursor)) { streak++; cursor = addDaysToKey(cursor, -1) }
    if (streak >= 2) insights.push({ id: 'streak', title: `${streak}-day streak`, detail: 'Consecutive days with a check-in.', basis: 'Your check-ins' })

    // Usual time
    if (last30.length >= 3) {
        const hours = {}
        last30.forEach(a => { const h = hourInTz(sessionCheckIn(a), tz); hours[h] = (hours[h] || 0) + 1 })
        const [usual] = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]
        insights.push({ id: 'usual', title: `You usually arrive around ${hourLabel(Number(usual))}`, detail: `Based on ${last30.length} check-ins in the last 30 days.`, basis: 'Your check-ins' })
    }

    // Most trained
    const groups = {}
    last30.forEach(a => sessionWorkout(a).forEach(g => { groups[g] = (groups[g] || 0) + 1 }))
    const ranked = Object.entries(groups).sort((a, b) => b[1] - a[1])
    if (ranked.length) {
        insights.push({ id: 'focus', title: `Most trained: ${ranked[0][0]}`, detail: ranked.slice(0, 4).map(([g, c]) => `${g} ×${c}`).join(' · '), basis: 'Workouts you selected at check-in' })
    }

    // Session length (only real, member/owner/device-closed sessions)
    const durations = last30.map(sessionDurationMinutes).filter(m => m !== null && m >= 5 && m <= 360)
    if (durations.length >= 3) {
        insights.push({ id: 'duration', title: `Average session: ${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)} minutes`, detail: `From ${durations.length} sessions you completed.`, basis: 'Check-in and check-out times' })
    }

    // Quietest / busiest hour for this weekday, from anonymous gym-wide counts
    const weekday = weekdayInTz(now, tz)
    const byHour = {}
    const sameWeekdayDates = new Set()
    gymRecent.forEach(a => {
        const t = sessionCheckIn(a)
        if (!t || weekdayInTz(t, tz) !== weekday || dateKey(t, tz) === today) return
        sameWeekdayDates.add(dateKey(t, tz))
        const h = hourInTz(t, tz)
        byHour[h] = (byHour[h] || 0) + 1
    })
    const entries = Object.entries(byHour).map(([h, c]) => [Number(h), c])
    if (sameWeekdayDates.size >= 2 && entries.length >= 3) {
        const busiest = entries.sort((a, b) => b[1] - a[1])[0]
        const quietest = entries.sort((a, b) => a[1] - b[1])[0]
        insights.push({ id: 'busy', title: `${weekday}s are busiest around ${hourLabel(busiest[0])}`, detail: `Fewest check-ins around ${hourLabel(quietest[0])}. Based on the last ${sameWeekdayDates.size} ${weekday}s at your gym.`, basis: 'Anonymous gym check-in counts' })
    }

    // Membership facts
    const status = getEffectiveStatus(member.data, now, tz)
    const left = daysUntilExpiry(member.data, now, tz)
    if (status === 'Active' && left !== null && left <= 14) insights.push({ id: 'expiry', title: `Membership expires in ${left} day${left === 1 ? '' : 's'}`, detail: 'Renew at the front desk to keep checking in.', basis: 'Your membership', tone: 'warning', href: '/portal/membership' })
    if (status !== 'Active') insights.push({ id: 'status', title: `Membership is ${status.toLowerCase()}`, detail: 'Contact your gym to activate it.', basis: 'Your membership', tone: 'warning', href: '/portal/membership' })
    const due = getOutstanding(member.data)
    if (due > 0) insights.push({ id: 'dues', title: `Outstanding balance: ₹${due.toLocaleString('en-IN')}`, detail: 'See payment options under Payments & Dues.', basis: 'Your payment record', tone: 'warning', href: '/portal/billing' })

    return plain({
        available: true,
        generatedAt: now.toISOString(),
        today: { weekday, planned: getPlannedWorkout(member.data, weekday), insideNow: live.insideCount, capacity: live.capacity },
        insights,
    })
}
