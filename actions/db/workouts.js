'use server'


import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getWorkoutPlans(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            let query = adminDb.collection('workout_plans')
            if (memberId) query = query.where('member_id', '==', memberId)
            const snap = await query.get()
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
    }
    return [];
}

export async function getWorkoutLogs(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            let query = adminDb.collection('workout_logs')
            if (memberId) query = query.where('member_id', '==', memberId)
            const snap = await query.get()
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
    }
    return [];
}

export async function createWorkoutLog(logData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const docRef = await adminDb.collection('workout_logs').add(logData)
            revalidatePath('/portal')
            revalidatePath('/trainer')
            return { id: docRef.id, ...logData }
        }
    }
    return { id: 'mock', ...logData };
}
