'use server'

import { cookies } from 'next/headers'
import { isFirebaseConfigured } from '@/lib/firebase/server'
import { v4 as uuidv4 } from 'uuid'

async function getAdminDb() {
    const { adminDb } = await import('@/lib/firebase/server')
    return adminDb
}

async function verifyOwner() {
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) throw new Error('Unauthorized')

    let user;
    try { user = JSON.parse(sessionStr) } catch { throw new Error('Invalid session') }

    if (user.role !== 'owner' && user.role !== 'superadmin') {
        throw new Error('Only gym owners can access data import.')
    }

    return user
}

// 1. Validate the Batch
export async function validateImportBatch(mappedRows) {
    if (!isFirebaseConfigured()) throw new Error('Database not connected')

    const user = await verifyOwner()
    const gymId = user.gymId || user.gym_id // Fallback for various ID schema versions in session
    const adminDb = await getAdminDb()

    // Fetch existing ecosystem for the gym
    const [membersSnap, trainersSnap, plansSnap] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', gymId).get(),
        adminDb.collection('trainers').where('gymId', '==', gymId).get(),
        adminDb.collection('plans').where('gymId', '==', gymId).get(),
    ])

    const existingEmails = new Set()
    const existingPhones = new Set()
    const existingSourceIds = new Set()

    membersSnap.docs.forEach(d => {
        const data = d.data()
        if (data.email) existingEmails.add(data.email.toLowerCase())
        if (data.phone) existingPhones.add(data.phone)
        if (data.sourceMemberId) existingSourceIds.add(data.sourceMemberId)
    })

    const existingTrainers = {} // lowercase name -> doc id
    trainersSnap.docs.forEach(d => {
        existingTrainers[d.data().name?.toLowerCase() || ''] = d.id
    })

    const existingPlans = {} // lowercase name -> plan info
    plansSnap.docs.forEach(d => {
        const p = d.data()
        existingPlans[p.name.toLowerCase()] = p
    })

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    const validatedRows = mappedRows.map((row, index) => {
        const errs = []
        const warns = []
        let status = 'READY'

        let Name = row['Full Name'] ? row['Full Name'].toString().trim() : null
        let Mobile = row['Phone'] ? row['Phone'].toString().trim() : null
        let Email = row['Email'] ? row['Email'].toString().trim() : null
        let Plan = row['Membership Plan'] ? row['Membership Plan'].toString().trim() : null
        let Start = row['Start Date'] || null
        let Expiry = row['Expiry Date'] || null
        let Trainer = row['Trainer'] ? row['Trainer'].toString().trim() : null
        let SourceId = row['Source ID'] ? row['Source ID'].toString().trim() : null

        // 1. Hard Errors
        if (!Name) errs.push('Full Name is required')

        if (Email && existingEmails.has(Email.toLowerCase())) {
            errs.push(`Email already exists (${Email})`)
        }
        if (Mobile && existingPhones.has(Mobile)) {
            errs.push(`Phone already exists (${Mobile})`)
        }
        if (SourceId && existingSourceIds.has(SourceId)) {
            errs.push(`Member Source ID already exists (${SourceId})`)
        }

        if (Email && !Email.includes('@')) errs.push('Invalid email format')

        // 2. Warnings (Soft Matches)
        let resolvedTrainerId = null
        if (Trainer) {
            const tk = Trainer.toLowerCase()
            const match = existingTrainers[tk]
            if (match) {
                resolvedTrainerId = match
            } else {
                warns.push(`Trainer '${Trainer}' not found. Will be imported unassigned.`)
            }
        }

        let resolvedPlan = null
        if (Plan) {
            const pk = Plan.toLowerCase()
            const match = existingPlans[pk]
            if (match) {
                resolvedPlan = match
            } else {
                warns.push(`Plan '${Plan}' not found. Using generic placeholder.`)
            }
        }

        if (errs.length > 0) {
            status = 'ERROR'
            errorCount++
        } else if (warns.length > 0) {
            status = 'WARNING'
            warningCount++
        } else {
            status = 'READY'
            validCount++
        }

        return {
            ...row,
            _meta: { status, errors: errs, warnings: warns, resolvedTrainerId, resolvedPlanName: resolvedPlan?.name || Plan || 'Custom Plan' },
            _index: index
        }
    })

    return {
        validatedRows,
        summary: { validCount, warningCount, errorCount, total: mappedRows.length }
    }
}

// 2. Execute Import
export async function executeImportBatch(validatedRows, filename) {
    if (!isFirebaseConfigured()) throw new Error('Database not connected')
    const user = await verifyOwner()
    const gymId = user.gymId || user.gym_id
    const adminDb = await getAdminDb()

    const importBatchId = `BGM-IMPORT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const batchRecord = {
        gymId,
        importBatchId,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        fileName: filename || 'Upload',
        totalRows: validatedRows.length,
        status: 'PROCESSING',
        successCount: 0,
        warningCount: 0,
        errorCount: 0
    }

    const batchRef = adminDb.collection('import_batches').doc(importBatchId)
    await batchRef.set(batchRecord)

    // Execute Writes (Batched max 500)
    let chunks = [];
    for (let i = 0; i < validatedRows.length; i += 400) {
        chunks.push(validatedRows.slice(i, i + 400));
    }

    let successCount = 0;
    let failedCount = 0;

    for (const chunk of chunks) {
        const fireBatch = adminDb.batch()

        chunk.forEach(row => {
            // Skip broken rows safely
            if (row._meta.status === 'ERROR') {
                failedCount++;
                return;
            }

            const docRef = adminDb.collection('members').doc()
            const memberRecord = {
                gymId,
                name: row['Full Name'],
                phone: row['Phone'] || null,
                email: row['Email'] || null,
                plan: row._meta.resolvedPlanName,
                dob: null,
                bloodType: null,
                emergencyContact: null,

                // Track source metrics
                sourceSystem: 'csv_import',
                sourceMemberId: row['Source ID'] || null,
                importBatchId,

                created_at: new Date().toISOString(),

                // Analytics
                workout_logs: [],
                attendance: []
            }

            if (row._meta.resolvedTrainerId) {
                memberRecord.trainers = {
                    id: row._meta.resolvedTrainerId,
                    name: row['Trainer']
                }
            }

            fireBatch.set(docRef, memberRecord)

            // Replicate robust Revenue metrics identically avoiding broken Dashboards
            let Paid = parseFloat(row['Amount Paid'] || 0) || 0;
            let Due = parseFloat(row['Outstanding Amount'] || 0) || 0;
            let Status = row['Payment Status'] || (Due > 0 ? 'Pending' : 'PAID')

            const revRef = adminDb.collection('revenue').doc()
            fireBatch.set(revRef, {
                userId: docRef.id,
                gymId,
                userName: row['Full Name'],
                userImage: null,
                amount: Paid,
                outstanding: Due,
                planName: row._meta.resolvedPlanName,
                date: new Date().toISOString(),
                status: Status,
                type: 'Subscription',
                method: row['Payment Status'] === 'PAID' ? 'System Migration' : 'Pending',
                is_recurring: false,
                importBatchId
            })

            successCount++;
        })

        await fireBatch.commit()
    }

    // Update batch to completed
    await batchRef.update({
        status: failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        successCount,
        errorCount: failedCount
    })

    return { importBatchId, successCount, failedCount }
}
