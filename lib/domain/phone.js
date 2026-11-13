// Phone normalisation. India-first: a bare 10 digit mobile number is assumed
// to be +91. Returns null for anything that cannot be a real phone number.

export function normalizePhone(raw, defaultCountryCode = '91') {
    if (raw === null || raw === undefined) return null
    let s = String(raw).trim()
    if (!s) return null
    // Spreadsheet numeric artefacts such as "9876543210.0"
    s = s.replace(/\.0+$/, '')
    const hasPlus = s.startsWith('+')
    let digits = s.replace(/\D/g, '')
    if (!digits) return null

    if (hasPlus) {
        if (digits.length < 8 || digits.length > 15) return null
        return '+' + digits
    }
    if (digits.startsWith('00')) {
        digits = digits.slice(2)
        if (digits.length < 8 || digits.length > 15) return null
        return '+' + digits
    }
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
    if (digits.length === 12 && digits.startsWith(defaultCountryCode)) return '+' + digits
    if (digits.length === 10) {
        if (defaultCountryCode === '91' && !/^[6-9]/.test(digits)) return null
        return '+' + defaultCountryCode + digits
    }
    return null
}

export function isValidEmail(email) {
    if (!email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())
}

export function normalizeEmail(email) {
    if (!email) return null
    const e = String(email).trim().toLowerCase()
    return e || null
}
