// "Bring Your Data" — column detection and row validation for member imports.
// Pure functions: used by the browser for the mapping/preview step and re-run
// on the server before anything is written (client results are never trusted).

import { parseFlexibleDate } from './dates.js'
import { normalizePhone, normalizeEmail, isValidEmail } from './phone.js'
import { toMoney, computeDues } from './membership.js'

export const IMPORT_MAX_ROWS = 5000

export const IMPORT_FIELDS = [
    { key: 'name', label: 'Full Name', required: true, aliases: ['name', 'full name', 'member name', 'member', 'customer name', 'client name', 'student name', 'first name'] },
    { key: 'lastName', label: 'Last Name', aliases: ['last name', 'surname', 'family name'] },
    { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'mobile no', 'mobile number', 'phone number', 'contact', 'contact no', 'contact number', 'whatsapp', 'cell'] },
    { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'email id', 'email address', 'mail'] },
    { key: 'plan', label: 'Membership Plan', aliases: ['plan', 'membership', 'membership plan', 'package', 'plan name', 'membership type', 'subscription'] },
    { key: 'startDate', label: 'Start Date', aliases: ['start date', 'joining date', 'join date', 'joined', 'date of joining', 'doj', 'start', 'from', 'membership start'] },
    { key: 'expiryDate', label: 'Expiry Date', aliases: ['expiry date', 'expiry', 'end date', 'valid till', 'valid until', 'due date', 'expires', 'expiration', 'to', 'membership end', 'renewal date'] },
    { key: 'fee', label: 'Membership Fee', aliases: ['fee', 'fees', 'membership fee', 'amount', 'total', 'total amount', 'plan amount', 'price', 'package amount'] },
    { key: 'amountPaid', label: 'Amount Paid', aliases: ['amount paid', 'paid', 'paid amount', 'received', 'amount received', 'payment'] },
    { key: 'outstanding', label: 'Outstanding Amount', aliases: ['outstanding', 'outstanding amount', 'balance', 'due', 'due amount', 'pending', 'pending amount', 'balance due'] },
    { key: 'paymentMethod', label: 'Payment Method', aliases: ['payment method', 'payment mode', 'mode', 'method', 'paid via'] },
    { key: 'trainer', label: 'Trainer', aliases: ['trainer', 'trainer name', 'coach', 'assigned trainer', 'pt', 'personal trainer'] },
    { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'] },
    { key: 'dob', label: 'Date of Birth', aliases: ['dob', 'date of birth', 'birth date', 'birthday'] },
    { key: 'address', label: 'Address', aliases: ['address', 'city', 'location'] },
    { key: 'sourceId', label: 'Member ID (old system)', aliases: ['id', 'member id', 'membership no', 'membership number', 'member no', 'member code', 'reg no', 'registration no', 'biometric id', 'source id'] },
]

const norm = (s) => String(s ?? '').toLowerCase().replace(/[_\-./]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Suggests which source column feeds each BGM field.
 * Returns { fieldKey: headerName | null }. Each header is used at most once;
 * exact alias matches win over partial matches.
 */
export function detectColumnMapping(headers) {
    const list = (headers || []).filter(h => h !== null && h !== undefined && String(h).trim() !== '').map(h => String(h))
    const normalised = list.map(norm)
    const used = new Set()
    const mapping = {}

    const pick = (field, mode) => {
        for (const alias of field.aliases) {
            for (let i = 0; i < normalised.length; i++) {
                if (used.has(i)) continue
                const h = normalised[i]
                const hit = mode === 'exact' ? h === alias : (h.startsWith(alias + ' ') || h.endsWith(' ' + alias) || h.includes(' ' + alias + ' '))
                if (hit) { used.add(i); return list[i] }
            }
        }
        return null
    }
    for (const f of IMPORT_FIELDS) mapping[f.key] = pick(f, 'exact')
    for (const f of IMPORT_FIELDS) if (!mapping[f.key]) mapping[f.key] = pick(f, 'partial')
    return mapping
}

/** Applies a mapping to raw parsed rows → rows keyed by BGM field. */
export function applyMapping(rawRows, mapping) {
    return (rawRows || []).map(raw => {
        const out = {}
        for (const f of IMPORT_FIELDS) {
            const header = mapping?.[f.key]
            out[f.key] = header ? raw[header] ?? '' : ''
        }
        return out
    })
}

const text = (v, max) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max))
const isBlankRow = (row) => IMPORT_FIELDS.every(f => text(row[f.key], 10) === '')

const METHODS = { cash: 'Cash', upi: 'UPI', gpay: 'UPI', phonepe: 'UPI', paytm: 'UPI', card: 'Card', 'credit card': 'Card', 'debit card': 'Card', bank: 'Bank Transfer', neft: 'Bank Transfer', imps: 'Bank Transfer', 'bank transfer': 'Bank Transfer', cheque: 'Cheque', check: 'Cheque' }

/**
 * Validates mapped rows.
 *   ctx.existingEmails / existingPhones / existingSourceIds : Set of values already in the gym
 *   ctx.plans    : { lowercased name → { id, name, price } }
 *   ctx.trainers : { lowercased name → { id, name } }
 *   ctx.today    : YYYY-MM-DD in the gym's timezone
 * Each result row has status READY | WARNING | ERROR. ERROR rows are never imported.
 */
export function validateImportRows(rows, ctx = {}) {
    const existingEmails = ctx.existingEmails || new Set()
    const existingPhones = ctx.existingPhones || new Set()
    const existingSourceIds = ctx.existingSourceIds || new Set()
    const plans = ctx.plans || {}
    const trainers = ctx.trainers || {}
    const today = ctx.today || new Date().toISOString().slice(0, 10)

    const seenEmails = new Map(), seenPhones = new Map(), seenSource = new Map()
    const summary = { total: 0, ready: 0, warnings: 0, errors: 0, skippedBlank: 0 }
    const out = []

    ;(rows || []).forEach((row, index) => {
        if (isBlankRow(row)) { summary.skippedBlank++; return }
        const rowNumber = index + 2 // spreadsheet row (1 = header)
        const errors = []
        const warnings = []

        const name = [text(row.name, 80), text(row.lastName, 40)].filter(Boolean).join(' ').slice(0, 80)
        if (name.length < 2) errors.push('Full name is missing')

        // --- contact -----------------------------------------------------
        const rawEmail = text(row.email, 120)
        let email = ''
        if (rawEmail) {
            email = normalizeEmail(rawEmail)
            if (!isValidEmail(email)) { errors.push(`Invalid e-mail "${rawEmail}"`); email = '' }
        }
        const rawPhone = text(row.phone, 30)
        let phone = ''
        if (rawPhone) {
            phone = normalizePhone(rawPhone) || ''
            if (!phone) errors.push(`Invalid phone number "${rawPhone}"`)
        }
        if (!rawEmail && !rawPhone) errors.push('Needs a phone number or an e-mail')

        // --- duplicates --------------------------------------------------
        const sourceId = text(row.sourceId, 60)
        if (email) {
            if (existingEmails.has(email)) errors.push('Duplicate: e-mail already belongs to a member')
            else if (seenEmails.has(email)) errors.push(`Duplicate: same e-mail as row ${seenEmails.get(email)}`)
            else seenEmails.set(email, rowNumber)
        }
        if (phone) {
            if (existingPhones.has(phone)) errors.push('Duplicate: phone number already belongs to a member')
            else if (seenPhones.has(phone)) errors.push(`Duplicate: same phone number as row ${seenPhones.get(phone)}`)
            else seenPhones.set(phone, rowNumber)
        }
        if (sourceId) {
            if (existingSourceIds.has(sourceId)) errors.push('Duplicate: this member ID was already imported')
            else if (seenSource.has(sourceId)) errors.push(`Duplicate: same member ID as row ${seenSource.get(sourceId)}`)
            else seenSource.set(sourceId, rowNumber)
        }

        // --- dates -------------------------------------------------------
        let startDate = null, expiryDate = null
        if (text(row.startDate, 40)) {
            startDate = parseFlexibleDate(row.startDate)
            if (!startDate) errors.push(`Start date "${text(row.startDate, 40)}" is not a valid date`)
        }
        if (text(row.expiryDate, 40)) {
            expiryDate = parseFlexibleDate(row.expiryDate)
            if (!expiryDate) errors.push(`Expiry date "${text(row.expiryDate, 40)}" is not a valid date`)
        }
        if (startDate && expiryDate && expiryDate < startDate) errors.push('Expiry date is before the start date')
        if (!startDate) { startDate = today; if (!text(row.startDate, 40)) warnings.push('No start date — today will be used') }
        if (startDate > today && errors.length === 0) warnings.push('Start date is in the future')
        if (!expiryDate && !text(row.expiryDate, 40)) warnings.push('No expiry date — membership will not expire automatically')
        const expired = !!expiryDate && expiryDate < today
        if (expired) warnings.push('Membership has already expired — imported as Expired')
        let dob = ''
        if (text(row.dob, 40)) { dob = parseFlexibleDate(row.dob) || ''; if (!dob) warnings.push('Date of birth could not be read and was skipped') }

        // --- plan / trainer ---------------------------------------------
        const planText = text(row.plan, 60)
        const plan = planText ? plans[planText.toLowerCase()] || null : null
        if (planText && !plan) warnings.push(`Plan "${planText}" does not exist yet — the name is kept as text`)
        if (!planText) warnings.push('No membership plan')
        const trainerText = text(row.trainer, 80)
        const trainer = trainerText ? trainers[trainerText.toLowerCase()] || null : null
        if (trainerText && !trainer) warnings.push(`Trainer "${trainerText}" not found — member will be unassigned`)

        // --- money -------------------------------------------------------
        const hasFee = text(row.fee, 20) !== ''
        const hasPaid = text(row.amountPaid, 20) !== ''
        const hasDue = text(row.outstanding, 20) !== ''
        let fee = toMoney(row.fee), paid = toMoney(row.amountPaid)
        const due = toMoney(row.outstanding)
        if (fee < 0 || paid < 0 || due < 0) errors.push('Amounts cannot be negative')
        if (!hasFee && plan && !hasPaid && !hasDue) fee = 0
        if (!hasFee && (hasPaid || hasDue)) fee = Math.round((paid + due) * 100) / 100
        if (hasFee && !hasPaid && hasDue) paid = Math.max(0, Math.round((fee - due) * 100) / 100)
        if (paid > fee) { warnings.push('Amount paid is more than the fee — fee raised to match'); fee = paid }
        const dues = computeDues(fee, paid)
        if (hasFee && hasPaid && hasDue && Math.abs(dues.outstanding - due) > 0.5) warnings.push(`Outstanding recalculated as ${dues.outstanding} (fee − paid)`)
        const methodText = text(row.paymentMethod, 30).toLowerCase()
        const paymentMethod = METHODS[methodText] || (methodText ? 'Other' : 'Cash')

        const status = errors.length ? 'ERROR' : warnings.length ? 'WARNING' : 'READY'
        summary.total++
        if (status === 'ERROR') summary.errors++
        else if (status === 'WARNING') summary.warnings++
        else summary.ready++

        out.push({
            rowNumber, status, errors, warnings,
            data: {
                name, email, phone, sourceId, gender: text(row.gender, 20), dob, address: text(row.address, 240),
                plan: plan ? plan.name : planText, planId: plan ? plan.id : null,
                trainerId: trainer ? trainer.id : null, trainerName: trainer ? trainer.name : null,
                startDate, expiryDate, expired,
                fee: dues.fee, amountPaid: dues.paid, outstanding: dues.outstanding, paymentStatus: dues.paymentStatus, paymentMethod,
            },
        })
    })

    return { rows: out, summary }
}

/** CSV text for the downloadable error / warning report. */
export function buildErrorReportCsv(rows) {
    const esc = (v) => {
        let s = String(v ?? '')
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s // neutralise spreadsheet formula injection
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [['Row', 'Status', 'Name', 'Phone', 'Email', 'Problems'].join(',')]
    for (const r of rows || []) {
        if (r.status === 'READY') continue
        lines.push([r.rowNumber, r.status, r.data?.name, r.data?.phone, r.data?.email, [...(r.errors || []), ...(r.warnings || [])].join(' | ')].map(esc).join(','))
    }
    return lines.join('\n')
}
