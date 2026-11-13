// Timezone-safe date helpers. All "today" computations use the gym's IANA
// timezone (default Asia/Kolkata) instead of the server's clock offset.

export const DEFAULT_TZ = 'Asia/Kolkata'
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function safeTz(tz) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz || DEFAULT_TZ })
        return tz || DEFAULT_TZ
    } catch {
        return DEFAULT_TZ
    }
}

/** YYYY-MM-DD for the given instant in the given timezone. */
export function dateKey(date = new Date(), tz = DEFAULT_TZ) {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('en-CA', { timeZone: safeTz(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Hour of day (0-23) for the given instant in the given timezone. */
export function hourInTz(date = new Date(), tz = DEFAULT_TZ) {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return null
    const h = new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), hour: 'numeric', hourCycle: 'h23' }).format(d)
    return parseInt(h, 10) % 24
}

/** Full weekday name ("Monday") for the given instant in the given timezone. */
export function weekdayInTz(date = new Date(), tz = DEFAULT_TZ) {
    const d = date instanceof Date ? date : new Date(date)
    return new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), weekday: 'long' }).format(d)
}

/** YYYY-MM for the given instant in the given timezone. */
export function monthKey(date = new Date(), tz = DEFAULT_TZ) {
    const k = dateKey(date, tz)
    return k ? k.slice(0, 7) : null
}

export function isSameDay(a, b, tz = DEFAULT_TZ) {
    const ka = dateKey(a, tz)
    return !!ka && ka === dateKey(b, tz)
}

/** Adds whole days to a YYYY-MM-DD key (calendar arithmetic, tz independent). */
export function addDaysToKey(key, days) {
    const [y, m, d] = key.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + days))
    return dt.toISOString().slice(0, 10)
}

/**
 * Parses the date formats commonly found in gym software exports.
 * Accepts Date objects, Excel serial numbers, ISO (YYYY-MM-DD),
 * DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY and "12 Jan 2025" style strings.
 * Day-first is assumed for ambiguous numeric dates (Indian convention).
 * Returns a YYYY-MM-DD string or null when the value is not a real date.
 */
export function parseFlexibleDate(value) {
    if (value === null || value === undefined || value === '') return null

    const fromParts = (y, m, d) => {
        if (y < 100) y += y >= 70 ? 1900 : 2000
        if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null
        const dt = new Date(Date.UTC(y, m - 1, d))
        if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
        return dt.toISOString().slice(0, 10)
    }

    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null
        return fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
    }

    if (typeof value === 'number' && isFinite(value)) {
        // Excel serial date (days since 1899-12-30)
        if (value < 1 || value > 100000) return null
        const dt = new Date(Math.round((value - 25569) * 86400 * 1000))
        return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10)
    }

    const s = String(value).trim()
    if (!s) return null

    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/)
    if (m) return fromParts(+m[1], +m[2], +m[3])

    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s.*)?$/)
    if (m) return fromParts(+m[3], +m[2], +m[1])

    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
    m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{2,4})$/)
    if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return fromParts(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1])

    m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/)
    if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return fromParts(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2])

    if (/^\d{4,6}(\.\d+)?$/.test(s)) return parseFlexibleDate(Number(s))

    return null
}
