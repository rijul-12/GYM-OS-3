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
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            const sessionStr = cookieStore.get('gymos_session')?.value
            let gymId = 'DEMO'
            try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

            const payload = {
                ...trainerData,
                gymId,
                created_at: new Date().toISOString(),
                status: 'Pending',
                is_active: false,
                rating: 0.0,
                members: 0,
                performance: 0,
                schedule: 'Not Set'
            }
            const docRef = await adminDb.collection('trainers').add(payload)

            if (trainerData.email) {
                const { sendTrainerInviteEmail } = await import('@/lib/email')
                await sendTrainerInviteEmail({
                    email: trainerData.email,
                    name: trainerData.name,
                    gymCode: gymId,
                    salary: trainerData.salary,
                    docId: docRef.id
                }).catch(e => console.error("Invite Email Failed:", e));
            }

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

export async function getMyTrainerProfile() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        if (!sessionStr) return null;
        try {
            const session = JSON.parse(sessionStr);
            const snap = await adminDb.collection('trainers').where('gymId', '==', session.gymCode).where('email', '==', session.email).limit(1).get()
            if (!snap.empty) return { id: snap.docs[0].id, ...JSON.parse(JSON.stringify(snap.docs[0].data())) }
        } catch (e) { }
    }
    return null;
}
