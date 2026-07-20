'use server'

import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getTrainers() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            const snap = await adminDb.collection('trainers').where('gymId', '==', gymId).get()
            return snap.docs.map(doc => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data())) }))
        }
    }
    return [];
}

export async function createTrainer(trainerData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const payload = {
                ...trainerData,
                created_at: new Date().toISOString(),
                is_active: true,
                rating: 5.0,
                members: 0,
                performance: 100,
                schedule: 'M-F, 9am-5pm'
            }
            const docRef = await adminDb.collection('trainers').add(payload)
            revalidatePath('/trainers')
            revalidatePath('/dashboard')
            return { id: docRef.id, ...payload }
        }
    }
    return trainerData;
}

export async function approveTrainer(trainerId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('trainers').doc(trainerId).update({
                status: 'Active'
            })
            revalidatePath('/trainers')
            return true;
        }
    }
}

export async function suspendTrainer(trainerId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('trainers').doc(trainerId).update({
                status: 'Suspended'
            })
            revalidatePath('/trainers')
            return true;
        }
    }
}
