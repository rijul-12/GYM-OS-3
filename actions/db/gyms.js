'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, getGymContext, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { sanitizeOwnerPatch, sanitizeWidgets, ownerSettingsView, memberSettingsView } from '@/lib/server/gym-settings'
import { loadLiveState, queryAttendanceSince, queryGymSince, hourlyCheckins, dailyAttendance, sinceDaysAgo } from '@/lib/server/live'
import { computeSubscriptionStatus } from '@/lib/server/subscription'
import { getEffectiveStatus, daysUntilExpiry, getOutstanding, toMoney, MEMBER_STATUS } from '@/lib/domain/membership'
import { monthKey, dateKey } from '@/lib/domain/dates'

// --------------------------------------------------------------------
// Settings / branding
// --------------------------------------------------------------------

/** Settings for the caller's own gym, shaped by role. */
export async function getMyGymSettings() {
    const session = await getSession()
    if (!session || !adminDb || !session.gymId) return null
    const { gym, settings } = await getGymContext(session.gymId)
    if (!gym) return null
    return plain(session.role === 'owner' ? ownerSettingsView(gym, settings) : memberSettingsView(gym, settings, session.role))
}

/** Legacy name kept for existing callers; the gym id always comes from the session. */
export async function getGymSettings() {
    return (await getMyGymSettings()) || {}
}

/** Owner: update gym settings. Only whitelisted, validated keys are written. */
export async function saveGymBrand(_unused, patch) {
    const session = await authorize('owner')
    if (!session) return { success: false, error: UNAUTHORIZED.error }
    if (!adminDb) return { success: false, error: NO_DB.error }

    const { clean, errors } = sanitizeOwnerPatch(patch)
    if (Object.keys(clean).length === 0) return { success: false, error: errors[0] || 'Nothing to save.' }
    // The UPI ID is optional: UPI can be enabled without one, members simply see no UPI option until it is set.

    try {
        const batch = adminDb.batch()
        batch.set(adminDb.collection('gym_settings').doc(session.gymId), { ...clean, updatedAt: new Date().toISOString() }, { merge: true })
        if (clean.gymName) batch.update(adminDb.collection('gyms').doc(session.gymId), { gymName: clean.gymName, name: clean.gymName })
        await batch.commit()
        if ('upi_id' in clean || 'upi_enabled' in clean || 'razorpay_enabled' in clean || 'upi_show_to_members' in clean) {
            await audit(session, 'PAYMENT_SETTINGS_CHANGED', { keys: Object.keys(clean).filter(k => k.startsWith('upi') || k.startsWith('razorpay')) })
        }
        return { success: true, saved: clean, errors }
    } catch (e) {
        return { success: false, error: 'Could not save settings.' }
    }
}

/** Owner: save the gym's facilities / workout zones. */
export async function saveGymWidgets(_unused, widgets) {
    const session = await authorize('owner')
    if (!session || !adminDb) return false
    const clean = sanitizeWidgets(widgets)
    if (!clean) return false
    try {
        await adminDb.collection('gym_settings').doc(session.gymId).set({ widgets: clean, updatedAt: new Date().toISOString() }, { merge: true })
        revalidatePath('/settings'); revalidatePath('/dashboard'); revalidatePath('/occupancy'); revalidatePath('/portal')
        return true
    } catch {
        return false
    }
}

/**
 * Owner: rotate the gym's QR / join code. The previous code stops working
 * immediately because check-in only ever matches the gym's current code.
 */
export async function regenerateGymCode() {
    const session = await authorize('owner')
    if (!session || !adminDb) return null
    const gymRef = adminDb.collection('gyms').doc(session.gymId)
    const gymSnap = await gymRef.get()
    if (!gymSnap.exists) return null
    const existing = gymSnap.data()

    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const suffix = String(existing.gymName || existing.name || 'GYM').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
    let newCode = null
    for (let attempt = 0; attempt < 10 && !newCode; attempt++) {
        const bytes = crypto.randomBytes(6)
        const candidate = `GYM-${suffix}-${[...bytes].map(b => alphabet[b % alphabet.length]).join('')}`
        const [byField, byId] = await Promise.all([
            adminDb.collection('gyms').where('gymCode', '==', candidate).limit(1).get(),
            adminDb.collection('gyms').doc(candidate).get(),
        ])
        if (byField.empty && !byId.exists) newCode = candidate
    }
    if (!newCode) return null

    const now = new Date().toISOString()
    await gymRef.update({ gymCode: newCode, qrCreatedDate: existing.qrCreatedDate || existing.createdAt || now, qrLastResetDate: now })
    await audit(session, 'GYM_QR_REGENERATED', {})
    revalidatePath('/settings')
    return newCode
}

// --------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------

/**
 * Live + summary statistics for the caller's gym.
 * Members and trainers only receive anonymous aggregates (head-count and
 * zone demand); financial and per-member data is owner only.
 */
export async function getDashboardStats() {
    const session = await getSession()
    const empty = { insideCount: 0, capacity: null, zones: [], dailyLine: [], live: [] }
    if (!session || !adminDb || !session.gymId) return empty

    const { gym, settings, tz } = await getGymContext(session.gymId)
    if (!gym) return empty
    const now = new Date()
    const [liveState, recent] = await Promise.all([
        loadLiveState(session.gymId, { settings, gym, tz }),
        queryAttendanceSince(session.gymId, sinceDaysAgo(7, now)),
    ])
    const hourly = hourlyCheckins(recent, tz, now)

    const aggregate = {
        insideCount: liveState.insideCount,
        capacity: liveState.capacity,
        zones: liveState.zones,
        dailyLine: hourly.series,
        asOf: liveState.asOf,
    }
    if (session.role !== 'owner') return plain({ ...aggregate, live: [] })

    const [membersSnap, trainersSnap, txs, subscription] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', session.gymId).get(),
        adminDb.collection('trainers').where('gymId', '==', session.gymId).count().get(),
        queryGymSince('member_transactions', session.gymId, 'created_at', sinceDaysAgo(32, now)),
        computeSubscriptionStatus(session.gymId),
    ])

    const counts = { total: 0, active: 0, expired: 0, pending: 0, suspended: 0, expiringSoon: 0 }
    let outstandingTotal = 0
    membersSnap.docs.forEach(d => {
        const m = d.data()
        counts.total++
        const status = getEffectiveStatus(m, now, tz)
        if (status === MEMBER_STATUS.ACTIVE) {
            counts.active++
            const left = daysUntilExpiry(m, now, tz)
            if (left !== null && left <= 7) counts.expiringSoon++
        } else if (status === MEMBER_STATUS.EXPIRED) counts.expired++
        else if (status === MEMBER_STATUS.PENDING) counts.pending++
        else if (status === MEMBER_STATUS.SUSPENDED) counts.suspended++
        outstandingTotal += getOutstanding(m)
    })

    const thisMonth = monthKey(now, tz)
    const revenueMtd = txs
        .filter(tx => tx.status === 'PAID' && monthKey(tx.resolved_at || tx.created_at, tz) === thisMonth)
        .reduce((sum, tx) => sum + toMoney(tx.amount), 0)

    const today = dateKey(now, tz)
    const todays = recent.filter(a => dateKey(a.check_in_time || a.checkIn, tz) === today)
    const currencySymbol = String(settings.currency || '₹ INR').split(' ')[0]

    return plain({
        ...aggregate,
        live: liveState.live,
        totalMembers: counts.total,
        activeMembers: counts.active,
        expiredMembers: counts.expired,
        pendingMembers: counts.pending,
        suspendedMembers: counts.suspended,
        expiringSoon: counts.expiringSoon,
        totalTrainers: trainersSnap.data().count,
        todayCheckins: todays.length,
        todayUniqueMembers: new Set(todays.map(a => a.member_id).filter(Boolean)).size,
        weeklyLine: dailyAttendance(recent, tz, 7, now),
        revenueMtdValue: Math.round(revenueMtd * 100) / 100,
        revenueMtd: `${currencySymbol}${revenueMtd.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
        outstandingTotal: Math.round(outstandingTotal * 100) / 100,
        currencySymbol,
        subscription,
    })
}

// --------------------------------------------------------------------
// Super Admin
// --------------------------------------------------------------------

export async function getGyms() {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return []
    const [gymsSnap, subsSnap] = await Promise.all([
        adminDb.collection('gyms').get(),
        adminDb.collection('gym_subscriptions').get(),
    ])
    const subs = Object.fromEntries(subsSnap.docs.map(d => [d.id, d.data()]))

    const gyms = await Promise.all(gymsSnap.docs.map(async (doc) => {
        const g = doc.data()
        let members = 0
        try { members = (await adminDb.collection('members').where('gymId', '==', doc.id).count().get()).data().count } catch { }
        const sub = subs[doc.id] || {}
        return {
            id: doc.id,
            name: g.gymName || g.name || doc.id,
            gymCode: g.gymCode || doc.id,
            ownerName: g.ownerName || '',
            email: g.email || g.ownerEmail || '',
            phone: g.phone || '',
            city: g.city || '',
            status: g.status || 'Active',
            isDemo: !!g.isDemo,
            createdAt: g.createdAt || g.created_at || null,
            members,
            subscriptionStatus: sub.status || g.subscriptionStatus || null,
            plan: sub.plan || g.plan || null,
            trialEndDate: sub.trialEndDate || g.trialEndDate || null,
            subscriptionExpiryDate: sub.subscriptionExpiryDate || null,
        }
    }))
    return plain(gyms.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))))
}

export async function updateGymStatus(gymId, newStatus) {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return false
    if (!['Active', 'Pending', 'Suspended'].includes(newStatus)) return false
    if (typeof gymId !== 'string' || !gymId || gymId.includes('/')) return false
    try {
        const ref = adminDb.collection('gyms').doc(gymId)
        const snap = await ref.get()
        if (!snap.exists) return false
        await ref.update({ status: newStatus })
        await audit(session, 'GYM_STATUS_CHANGED', { gymId, from: snap.data().status || null, to: newStatus })
        revalidatePath('/super-admin/gyms')
        return true
    } catch {
        return false
    }
}

export async function deleteGym(gymId) {
    const session = await authorize('super_admin')
    if (!session || !adminDb) return { success: false, error: UNAUTHORIZED.error }
    if (typeof gymId !== 'string' || !gymId || gymId.includes('/')) return { success: false, error: 'Invalid gym.' }
    try {
        const { deleteGymFootprint } = await import('@/lib/server/deletion')
        const result = await deleteGymFootprint(gymId, { actor: session })
        revalidatePath('/super-admin/gyms'); revalidatePath('/super-admin')
        return plain(result)
    } catch (e) {
        return { success: false, error: e.message }
    }
}

/** Platform-wide figures computed from real records only. */
export async function getSuperAdminAnalytics() {
    const session = await authorize('super_admin')
    const zero = { totalGyms: 0, activeGyms: 0, pendingGyms: 0, trialGyms: 0, paidGyms: 0, totalMembers: 0, totalTrainers: 0, todayAttendance: 0, collectedThisMonth: 0, collectedLast12Months: 0, monthly: [] }
    if (!session || !adminDb) return zero
    try {
        const now = new Date()
        const tz = 'Asia/Kolkata'
        const todayStartIso = new Date(`${dateKey(now, tz)}T00:00:00+05:30`).toISOString()
        const [gymsSnap, subsSnap, memCount, trnCount, attCount, txSnap] = await Promise.all([
            adminDb.collection('gyms').get(),
            adminDb.collection('gym_subscriptions').get(),
            adminDb.collection('members').count().get(),
            adminDb.collection('trainers').count().get(),
            adminDb.collection('attendance').where('check_in_time', '>=', todayStartIso).count().get(),
            adminDb.collection('transactions').where('status', '==', 'captured').get(),
        ])
        const gyms = gymsSnap.docs.map(d => d.data())
        const status = (g) => String(g.status || 'Active').toLowerCase()
        const subs = subsSnap.docs.map(d => d.data())
        const nowMs = now.getTime()

        const byMonth = new Map()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15))
            byMonth.set(d.toISOString().slice(0, 7), 0)
        }
        txSnap.docs.forEach(d => {
            const t = d.data()
            const key = monthKey(t.verified_at || t.created_at, tz)
            if (key && byMonth.has(key)) byMonth.set(key, byMonth.get(key) + toMoney(t.amount))
        })
        const monthly = [...byMonth.entries()].map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }))

        return {
            totalGyms: gyms.length,
            activeGyms: gyms.filter(g => status(g) === 'active').length,
            pendingGyms: gyms.filter(g => status(g) === 'pending').length,
            trialGyms: subs.filter(s => s.status === 'Trial' && s.trialEndDate && new Date(s.trialEndDate).getTime() > nowMs).length,
            paidGyms: subs.filter(s => s.status === 'Active' && s.subscriptionExpiryDate && new Date(s.subscriptionExpiryDate).getTime() > nowMs).length,
            totalMembers: memCount.data().count,
            totalTrainers: trnCount.data().count,
            todayAttendance: attCount.data().count,
            collectedThisMonth: monthly[monthly.length - 1]?.revenue || 0,
            collectedLast12Months: monthly.reduce((a, m) => a + m.revenue, 0),
            monthly,
        }
    } catch (e) {
        console.error('super admin analytics failed:', e.message)
        return zero
    }
}
