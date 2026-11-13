// Gym settings: validation of owner edits and the views other roles may see.
import { sanitizeZones } from '@/lib/domain/occupancy'

const HEX = /^#[0-9a-fA-F]{6}$/
const UPI = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC']

const str = (max) => (v) => (typeof v === 'string' ? { ok: true, value: v.trim().slice(0, max) } : { ok: false })
const bool = (v) => (typeof v === 'boolean' ? { ok: true, value: v } : { ok: false })
const int = (min, max) => (v) => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n >= min && n <= max ? { ok: true, value: n } : { ok: false }
}
const color = (v) => (typeof v === 'string' && HEX.test(v) ? { ok: true, value: v } : { ok: false })
const image = (v) => {
    if (v === null || v === '') return { ok: true, value: null }
    if (typeof v !== 'string') return { ok: false }
    if (/^https:\/\//.test(v) && v.length < 2000) return { ok: true, value: v }
    if (/^data:image\/(png|jpe?g|webp);base64,/.test(v) && v.length < 300000) return { ok: true, value: v }
    return { ok: false }
}

/** Every key an owner is allowed to change, with its validator. Anything else is dropped. */
const OWNER_EDITABLE = {
    gymName: str(80), logoText: str(12), banner: str(160), footer: str(200),
    phone: str(30), email: str(120), address: str(240),
    primaryColor: color, accentColor: color, favicon: image, logo: image,
    currency: str(12), lang: str(24),
    timezone: (v) => (TIMEZONES.includes(v) ? { ok: true, value: v } : { ok: false }),
    buildingCapacity: int(1, 100000),
    // Member payment options
    upi_enabled: bool, upi_show_to_members: bool, razorpay_enabled: bool,
    upi_id: (v) => {
        if (v === '' || v === null) return { ok: true, value: '' }
        return typeof v === 'string' && UPI.test(v.trim()) ? { ok: true, value: v.trim() } : { ok: false, error: 'Enter a valid UPI ID, e.g. yourgym@okhdfcbank' }
    },
    memberFeeRecovery: bool, memberFeeAmount: int(0, 100000),
    // Notification preferences
    notif_signups: bool, notif_expiring: bool, notif_peak: bool, notif_daily_rev: bool,
    // Attendance
    att_auto_checkout: bool, att_timeout: int(30, 720),
    publicDisplay: bool,
}

export function sanitizeOwnerPatch(patch) {
    const clean = {}
    const errors = []
    if (!patch || typeof patch !== 'object') return { clean, errors }
    for (const [key, value] of Object.entries(patch)) {
        const validate = OWNER_EDITABLE[key]
        if (!validate) continue
        const res = validate(value)
        if (res.ok) clean[key] = res.value
        else errors.push(res.error || `Invalid value for ${key}`)
    }
    return { clean, errors }
}

export function sanitizeWidgets(widgets) {
    if (!Array.isArray(widgets)) return null
    return widgets.slice(0, 24).filter(w => w && typeof w === 'object' && (w.name || w.muscleGroup)).map((w, i) => {
        const cap = parseInt(w.capacity, 10)
        return {
            id: String(w.id || `w${Date.now()}_${i}`).slice(0, 40),
            name: String(w.name || w.muscleGroup).trim().slice(0, 40),
            muscleGroup: String(w.muscleGroup || w.name).trim().slice(0, 40),
            capacity: Number.isFinite(cap) && cap > 0 && cap <= 10000 ? cap : null,
            isActive: w.isActive !== false,
            emoji: String(w.emoji || '•').slice(0, 8),
            color: HEX.test(w.color || '') ? w.color : '#3b82f6',
        }
    })
}

const BRANDING_KEYS = ['logoText', 'banner', 'footer', 'phone', 'email', 'address', 'primaryColor', 'accentColor', 'favicon', 'logo', 'currency', 'timezone', 'lang']

/** Settings as the owner sees them (everything). */
export function ownerSettingsView(gym, settings) {
    const out = {}
    for (const key of Object.keys(OWNER_EDITABLE)) if (settings[key] !== undefined) out[key] = settings[key]
    return {
        ...out,
        gymId: gym.id,
        gymName: gym.gymName || gym.name || settings.gymName || 'Your Gym',
        gymCode: gym.gymCode || gym.id,
        qrCreatedDate: gym.qrCreatedDate || gym.createdAt || null,
        qrLastResetDate: gym.qrLastResetDate || null,
        widgets: Array.isArray(settings.widgets) ? settings.widgets : null,
        zones: sanitizeZones(settings.widgets),
        onboarded: settings.onboarded !== false,
    }
}

/**
 * Settings as members and trainers of the gym see them: branding and the
 * payment options the owner chose to expose. The UPI ID is only included when
 * the owner enabled UPI *and* chose to show it to members.
 */
export function memberSettingsView(gym, settings, role) {
    const out = {}
    for (const key of BRANDING_KEYS) if (settings[key] !== undefined) out[key] = settings[key]
    const upiVisible = role === 'member' && !!settings.upi_enabled && settings.upi_show_to_members !== false && !!settings.upi_id
    return {
        ...out,
        gymId: gym.id,
        gymName: gym.gymName || gym.name || settings.gymName || 'Your Gym',
        zones: sanitizeZones(settings.widgets),
        upi_enabled: upiVisible,
        upi_id: upiVisible ? settings.upi_id : null,
        razorpay_enabled: role === 'member' ? !!settings.razorpay_enabled : false,
    }
}
