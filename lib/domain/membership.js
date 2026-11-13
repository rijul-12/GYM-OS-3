// Single source of truth for membership status and dues.
//
// A member document stores an administrative `status` chosen by the owner
// (Pending / Active / Suspended / Cancelled / Inactive). Whether a membership
// is *currently valid* is always derived here by combining that stored status
// with the expiry date, so an expired membership can never appear active just
// because nobody flipped a flag.

import { dateKey, parseFlexibleDate, DEFAULT_TZ } from './dates.js'

export const MEMBER_STATUS = Object.freeze({
    PENDING: 'Pending',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    SUSPENDED: 'Suspended',
    CANCELLED: 'Cancelled',
    INACTIVE: 'Inactive',
})

/** Statuses that count towards a gym's plan/member limit. */
export const BILLABLE_STATUSES = [MEMBER_STATUS.ACTIVE, MEMBER_STATUS.PENDING]

/** Maps legacy / free-text stored values onto the canonical administrative status. */
export function normalizeStoredStatus(member) {
    if (!member) return MEMBER_STATUS.INACTIVE
    const raw = String(member.status ?? member.membershipStatus ?? '').trim().toLowerCase()
    switch (raw) {
        case 'active':
        case 'expiring':
        case 'paid':
            return member.is_active === false ? MEMBER_STATUS.INACTIVE : MEMBER_STATUS.ACTIVE
        case 'pending':
        case 'unpaid':
            return MEMBER_STATUS.PENDING
        case 'suspended':
        case 'frozen':
        case 'paused':
            return MEMBER_STATUS.SUSPENDED
        case 'cancelled':
        case 'canceled':
            return MEMBER_STATUS.CANCELLED
        case 'expired':
            return MEMBER_STATUS.EXPIRED
        case 'inactive':
        case 'deactivated':
            return MEMBER_STATUS.INACTIVE
        case '':
            return member.is_active === true ? MEMBER_STATUS.ACTIVE : MEMBER_STATUS.PENDING
        default:
            return MEMBER_STATUS.INACTIVE
    }
}

/** Canonical expiry date (YYYY-MM-DD) or null when the membership is open ended. */
export function getExpiryDate(member) {
    if (!member) return null
    const raw = member.expiryDate ?? member.membershipExpiry ?? member.membership_expiry ?? member.expiry_date ?? member.valid_until ?? member.expiry ?? null
    return parseFlexibleDate(raw)
}

export function getStartDate(member) {
    if (!member) return null
    const raw = member.startDate ?? member.joinedAt ?? member.created_at ?? member.createdAt ?? null
    if (raw && typeof raw === 'object' && typeof raw._seconds === 'number') return new Date(raw._seconds * 1000).toISOString().slice(0, 10)
    return parseFlexibleDate(raw)
}

/**
 * The status every portal must display and enforce.
 * The expiry day itself is still valid; the membership lapses the day after.
 */
export function getEffectiveStatus(member, now = new Date(), tz = DEFAULT_TZ) {
    const stored = normalizeStoredStatus(member)
    if (stored !== MEMBER_STATUS.ACTIVE) return stored
    const expiry = getExpiryDate(member)
    if (expiry && expiry < dateKey(now, tz)) return MEMBER_STATUS.EXPIRED
    return MEMBER_STATUS.ACTIVE
}

export function isMembershipActive(member, now = new Date(), tz = DEFAULT_TZ) {
    return getEffectiveStatus(member, now, tz) === MEMBER_STATUS.ACTIVE
}

/** Whole days until expiry (negative when lapsed, null when open ended). */
export function daysUntilExpiry(member, now = new Date(), tz = DEFAULT_TZ) {
    const expiry = getExpiryDate(member)
    if (!expiry) return null
    const today = dateKey(now, tz)
    return Math.round((Date.parse(expiry + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000)
}

export function toMoney(value) {
    if (typeof value === 'number') return isFinite(value) ? Math.round(value * 100) / 100 : 0
    if (value === null || value === undefined) return 0
    const n = parseFloat(String(value).replace(/[^0-9.\-]/g, ''))
    return isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/**
 * Dues are always derived from fee and amount paid on the server.
 * A client supplied "outstanding" or "payment status" is never trusted.
 */
export function computeDues(fee, paid) {
    const f = Math.max(0, toMoney(fee))
    const p = Math.max(0, toMoney(paid))
    const outstanding = Math.max(0, Math.round((f - p) * 100) / 100)
    let paymentStatus = 'Unpaid'
    if (f === 0 && p === 0) paymentStatus = 'Unpaid'
    else if (outstanding === 0) paymentStatus = 'Paid'
    else if (p > 0) paymentStatus = 'Partial'
    return { fee: f, paid: p, outstanding, paymentStatus }
}

export function getOutstanding(member) {
    if (!member) return 0
    return Math.max(0, toMoney(member.outstandingAmount ?? member.outstanding ?? 0))
}

/** Adds a plan duration to a YYYY-MM-DD start date. */
export function addDuration(startKey, months = 1) {
    const [y, m, d] = startKey.split('-').map(Number)
    const target = new Date(Date.UTC(y, m - 1 + months, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
    target.setUTCDate(Math.min(d, lastDay))
    return target.toISOString().slice(0, 10)
}

/** Billing cycle label -> number of months. */
export function cycleToMonths(cycle) {
    const c = String(cycle || '').toLowerCase()
    if (c.includes('year') || c.includes('annual')) return 12
    if (c.includes('half') || c.includes('6')) return 6
    if (c.includes('quarter') || c.includes('3')) return 3
    const n = parseInt(c, 10)
    if (n > 0 && n <= 60) return n
    return 1
}
