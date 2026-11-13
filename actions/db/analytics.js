'use server'

import { adminDb } from '@/lib/firebase/server'
import { requireRole, getGymContext, plain } from '@/lib/server/session'
import { queryAttendanceSince, queryGymSince, dailyAttendance, sinceDaysAgo } from '@/lib/server/live'
import { getEffectiveStatus, getStartDate, getOutstanding, toMoney, MEMBER_STATUS } from '@/lib/domain/membership'
import { dateKey, hourInTz, monthKey, weekdayInTz } from '@/lib/domain/dates'
import { sessionCheckIn, sessionMemberId, sessionDurationMinutes, sanitizeZones, workoutMatchesGroup } from '@/lib/domain/occupancy'
import { sessionWorkout } from '@/lib/domain/schedule'

const EMPTY = { generatedAt: null, members: {}, attendance: {}, revenue: {}, trainers: [], demand: [], plans: [] }

/** Owner analytics. Every figure is computed from stored records; nothing is estimated. */
export async function getAnalyticsStats() {
    const session = await requireRole('owner')
    if (!adminDb) return EMPTY
    const gymId = session.gymId
    const { settings, tz } = await getGymContext(gymId)
    const now = new Date()

    const [membersSnap, trainersSnap, attendance, txs] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', gymId).get(),
        adminDb.collection('trainers').where('gymId', '==', gymId).get(),
        queryAttendanceSince(gymId, sinceDaysAgo(30, now)),
        queryGymSince('member_transactions', gymId, 'created_at', sinceDaysAgo(190, now)),
    ])
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // ---- Members -------------------------------------------------------
    const statusCounts = { Active: 0, Expired: 0, Pending: 0, Suspended: 0, Cancelled: 0, Inactive: 0 }
    let outstandingTotal = 0, membersWithDues = 0
    const planCounts = {}
    members.forEach(m => {
        const s = getEffectiveStatus(m, now, tz)
        statusCounts[s] = (statusCounts[s] || 0) + 1
        const due = getOutstanding(m)
        outstandingTotal += due
        if (due > 0) membersWithDues++
        if (s === MEMBER_STATUS.ACTIVE) planCounts[m.plan || 'No plan'] = (planCounts[m.plan || 'No plan'] || 0) + 1
    })

    // Membership trend: new joiners per month and cumulative total, last 6 months.
    const months = []
    for (let i = 5; i >= 0; i--) months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15)).toISOString().slice(0, 7))
    const joinedByMonth = Object.fromEntries(months.map(m => [m, 0]))
    let before = 0
    members.forEach(m => {
        const start = getStartDate(m)
        if (!start) return
        const key = start.slice(0, 7)
        if (key in joinedByMonth) joinedByMonth[key]++
        else if (key < months[0]) before++
    })
    let running = before
    const growth = months.map(m => { running += joinedByMonth[m]; return { month: m, joined: joinedByMonth[m], total: running } })

    // ---- Attendance (last 30 days) ------------------------------------
    const daily = dailyAttendance(attendance, tz, 30, now)
    const hourCounts = new Array(24).fill(0)
    const weekdayCounts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 }
    const visitsByMember = {}
    let durationSum = 0, durationCount = 0
    const windowStart = daily[0].date
    attendance.forEach(a => {
        const t = sessionCheckIn(a)
        const key = dateKey(t, tz)
        if (!key || key < windowStart) return
        const h = hourInTz(t, tz)
        if (h !== null) hourCounts[h]++
        const wd = weekdayInTz(t, tz)
        if (wd in weekdayCounts) weekdayCounts[wd]++
        const id = sessionMemberId(a)
        if (id) visitsByMember[id] = (visitsByMember[id] || 0) + 1
        const mins = sessionDurationMinutes(a)
        if (mins !== null && mins >= 5 && mins <= 360) { durationSum += mins; durationCount++ }
    })
    const totalCheckins = daily.reduce((s, d) => s + d.checkins, 0)
    const peakHour = hourCounts.some(c => c > 0) ? hourCounts.indexOf(Math.max(...hourCounts)) : null
    const nameById = Object.fromEntries(members.map(m => [m.id, m.name || 'Member']))
    const topMembers = Object.entries(visitsByMember).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, visits]) => ({ id, name: nameById[id] || 'Member', visits }))
    const activeIds = new Set(members.filter(m => getEffectiveStatus(m, now, tz) === MEMBER_STATUS.ACTIVE).map(m => m.id))
    const visitedActive = [...activeIds].filter(id => visitsByMember[id]).length

    // ---- Workout demand (last 30 days) ---------------------------------
    const zones = sanitizeZones(settings.widgets)
    const demand = zones.map(z => ({ name: z.name, color: z.color, sessions: attendance.filter(a => workoutMatchesGroup(sessionWorkout(a), z.muscleGroup)).length }))

    // ---- Revenue (member → gym, confirmed payments only) --------------
    const revenueByMonth = Object.fromEntries(months.map(m => [m, 0]))
    const byMethod = {}
    txs.forEach(tx => {
        if (tx.status !== 'PAID') return
        const key = monthKey(tx.resolved_at || tx.created_at, tz)
        if (key in revenueByMonth) revenueByMonth[key] += toMoney(tx.amount)
        if (key === months[months.length - 1]) byMethod[tx.method || 'Other'] = (byMethod[tx.method || 'Other'] || 0) + toMoney(tx.amount)
    })
    const pendingVerification = txs.filter(tx => tx.status === 'PENDING_VERIFICATION').reduce((s, tx) => s + toMoney(tx.amount), 0)

    // ---- Trainers ------------------------------------------------------
    const trainers = trainersSnap.docs.map(d => {
        const t = d.data()
        const ids = new Set([d.id, t.uid].filter(Boolean))
        const assigned = members.filter(m => ids.has(m.trainer_id))
        return {
            id: d.id, name: t.name || 'Trainer', status: t.status || 'Pending',
            assignedMembers: assigned.length,
            activeMembers: assigned.filter(m => activeIds.has(m.id)).length,
            memberVisits30d: assigned.reduce((s, m) => s + (visitsByMember[m.id] || 0), 0),
        }
    }).sort((a, b) => b.assignedMembers - a.assignedMembers)

    const currencySymbol = String(settings.currency || '₹ INR').split(' ')[0]
    return plain({
        generatedAt: now.toISOString(), timezone: tz, currencySymbol,
        members: { total: members.length, ...statusCounts, outstandingTotal: Math.round(outstandingTotal * 100) / 100, membersWithDues, growth },
        plans: Object.entries(planCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        attendance: {
            daily, totalCheckins,
            avgDailyCheckins: Math.round((totalCheckins / 30) * 10) / 10,
            hourly: hourCounts.map((count, hour) => ({ hour, label: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'am' : 'pm'}`, count })).filter(h => h.hour >= 5),
            weekday: Object.entries(weekdayCounts).map(([day, count]) => ({ day: day.slice(0, 3), count })),
            peakHour, topMembers,
            avgSessionMinutes: durationCount >= 5 ? Math.round(durationSum / durationCount) : null,
            sessionsWithDuration: durationCount,
            activeMembersVisited: visitedActive, activeMembers: activeIds.size,
        },
        demand,
        revenue: {
            monthly: months.map(m => ({ month: m, amount: Math.round(revenueByMonth[m]) })),
            thisMonth: Math.round(revenueByMonth[months[months.length - 1]]),
            byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount: Math.round(amount) })),
            pendingVerification: Math.round(pendingVerification),
        },
        trainers,
    })
}
