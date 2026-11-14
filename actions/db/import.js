'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { authorize, getGymContext, getGymScopedDoc, audit, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { loadDuplicateIndex, checkMemberCapacity, loadPlans, loadTrainers } from '@/lib/server/members'
import { validateImportRows, IMPORT_MAX_ROWS, IMPORT_FIELDS } from '@/lib/domain/import'
import { MEMBER_STATUS } from '@/lib/domain/membership'
import { dateKey } from '@/lib/domain/dates'

const FIELD_KEYS = IMPORT_FIELDS.map(f => f.key)

/** Keeps only known fields and bounded primitive values from client rows. */
function sanitizeRows(rows) {
    if (!Array.isArray(rows)) return null
    return rows.slice(0, IMPORT_MAX_ROWS + 1).map(row => {
        const clean = {}
        for (const key of FIELD_KEYS) {
            const v = row?.[key]
            clean[key] = (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, 300) : ''
        }
        return clean
    })
}

async function validateForGym(gymId, rows) {
    const { tz } = await getGymContext(gymId)
    const [dupes, plans, trainers] = await Promise.all([loadDuplicateIndex(gymId), loadPlans(gymId), loadTrainers(gymId)])
    return validateImportRows(rows, {
        existingEmails: new Set(dupes.emails.keys()),
        existingPhones: new Set(dupes.phones.keys()),
        existingSourceIds: new Set(dupes.sourceIds.keys()),
        plans: plans.byName,
        trainers: Object.fromEntries(Object.entries(trainers.byName).map(([k, t]) => [k, { id: t.id, name: t.name }])),
        today: dateKey(new Date(), tz),
    })
}

/** Step "Validate": checks the mapped rows against the gym's data. Writes nothing. */
export async function validateImportBatch(mappedRows) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const rows = sanitizeRows(mappedRows)
    if (!rows) return { error: 'No rows to validate.' }
    if (rows.length > IMPORT_MAX_ROWS) return { error: `A single import can contain at most ${IMPORT_MAX_ROWS} rows. Split the file and import it in parts.` }
    if (rows.length === 0) return { error: 'The file has no data rows.' }

    const result = await validateForGym(session.gymId, rows)
    const importable = result.summary.ready + result.summary.warnings
    const capacity = await checkMemberCapacity(session.gymId, importable)
    return plain({ success: true, rows: result.rows, summary: result.summary, importable, capacityError: capacity.ok ? null : capacity.error })
}

/**
 * Step "Import": runs only after the owner confirmed the preview.
 * The rows are validated again on the server — statuses sent by the browser are
 * ignored — and every created member carries the importBatchId.
 */
export async function executeImportBatch(mappedRows, filename, { includeWarnings = true } = {}) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const rows = sanitizeRows(mappedRows)
    if (!rows || rows.length === 0) return { error: 'No rows to import.' }
    if (rows.length > IMPORT_MAX_ROWS) return { error: `A single import can contain at most ${IMPORT_MAX_ROWS} rows.` }

    const gymId = session.gymId
    const { rows: validated, summary } = await validateForGym(gymId, rows)
    const toImport = validated.filter(r => r.status === 'READY' || (includeWarnings && r.status === 'WARNING'))
    if (toImport.length === 0) return { error: 'None of the rows can be imported. Download the error report to see why.' }

    const capacity = await checkMemberCapacity(gymId, toImport.length)
    if (!capacity.ok) return { error: capacity.error }

    const importBatchId = `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const batchRef = adminDb.collection('import_batches').doc(importBatchId)
    const startedAt = new Date().toISOString()
    await batchRef.set({
        gymId, importBatchId, createdBy: session.uid, createdByEmail: session.email, createdAt: startedAt,
        fileName: String(filename || 'upload').slice(0, 120), totalRows: summary.total, status: 'PROCESSING',
        successCount: 0, warningCount: 0, errorCount: summary.errors, skippedCount: 0,
    })

    const failures = validated.filter(r => r.status === 'ERROR').map(r => ({ rowNumber: r.rowNumber, name: r.data.name, phone: r.data.phone, email: r.data.email, reasons: r.errors }))
    if (!includeWarnings) validated.filter(r => r.status === 'WARNING').forEach(r => failures.push({ rowNumber: r.rowNumber, name: r.data.name, phone: r.data.phone, email: r.data.email, reasons: ['Skipped (has warnings): ' + r.warnings.join('; ')] }))

    let successCount = 0, warningCount = 0
    const CHUNK = 200 // up to 2 writes per member → stays under the 500-write batch limit
    for (let i = 0; i < toImport.length; i += CHUNK) {
        const chunk = toImport.slice(i, i + CHUNK)
        const batch = adminDb.batch()
        const now = new Date().toISOString()
        for (const r of chunk) {
            const d = r.data
            const memberRef = adminDb.collection('members').doc()
            batch.set(memberRef, {
                gymId, name: d.name, email: d.email, phone: d.phone,
                dob: d.dob, gender: d.gender, address: d.address, emergencyContact: '', goal: '', preferredTime: '',
                plan: d.plan, planId: d.planId, startDate: d.startDate, expiryDate: d.expiryDate,
                // Stored as Active; an elapsed expiry date makes it show as Expired everywhere.
                status: MEMBER_STATUS.ACTIVE, is_active: true,
                paymentFee: d.fee, paymentAmount: d.amountPaid, outstandingAmount: d.outstanding,
                payment_status: d.paymentStatus, paymentMethod: d.paymentMethod,
                trainer_id: d.trainerId, trainer_name: d.trainerName || 'Unassigned', trainer_status: d.trainerId ? 'Active' : null,
                noFixedSchedule: true, schedule: null,
                authUid: null, photoURL: null, activeSessionId: null,
                sourceSystem: 'import', sourceMemberId: d.sourceId || null, importBatchId,
                created_at: now, createdBy: session.uid,
            })
            if (d.amountPaid > 0) {
                // Historical payment: dated at the membership start so it is not counted as revenue collected today.
                const paidAt = new Date(`${d.startDate}T12:00:00+05:30`).toISOString()
                batch.set(adminDb.collection('member_transactions').doc(), {
                    gymId, memberId: memberRef.id, memberName: d.name, amount: d.amountPaid, method: d.paymentMethod,
                    status: 'PAID', type: 'membership', note: 'Imported opening payment', imported: true, importBatchId,
                    created_at: paidAt, resolved_at: paidAt, recordedBy: session.uid,
                })
            }
        }
        try {
            await batch.commit()
            successCount += chunk.length
            warningCount += chunk.filter(r => r.status === 'WARNING').length
        } catch (e) {
            console.error('import chunk failed:', e.message)
            chunk.forEach(r => failures.push({ rowNumber: r.rowNumber, name: r.data.name, phone: r.data.phone, email: r.data.email, reasons: ['Could not be saved — please import this row again'] }))
        }
    }

    const status = successCount === 0 ? 'FAILED' : (failures.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED')
    await batchRef.update({
        status, successCount, warningCount, errorCount: failures.length, completedAt: new Date().toISOString(),
        failures: failures.slice(0, 1000).map(f => ({ ...f, reasons: f.reasons.slice(0, 6) })),
    })
    await audit(session, 'MEMBERS_IMPORTED', { importBatchId, successCount, failed: failures.length })
    revalidatePath('/members'); revalidatePath('/dashboard'); revalidatePath('/dashboard/import')
    return plain({ success: successCount > 0, importBatchId, successCount, warningCount, failedCount: failures.length, failures: failures.slice(0, 1000), status })
}

/** Import history for the owner's gym. */
export async function getImportHistory() {
    const session = await authorize('owner')
    if (!session || !adminDb) return []
    const snap = await adminDb.collection('import_batches').where('gymId', '==', session.gymId).get()
    return plain(snap.docs.map(d => {
        const b = d.data()
        return { id: d.id, fileName: b.fileName, createdAt: b.createdAt, createdByEmail: b.createdByEmail || '', status: b.status, totalRows: b.totalRows || 0, successCount: b.successCount || 0, warningCount: b.warningCount || 0, errorCount: b.errorCount || 0 }
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100))
}

/** Rows that were not imported in a past batch (for the downloadable report). */
export async function getImportFailures(batchId) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('import_batches', batchId, session.gymId)
    if (!snap) return { error: 'Import not found.' }
    return plain({ success: true, fileName: snap.data().fileName, failures: snap.data().failures || [] })
}
