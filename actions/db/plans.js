'use server'

import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getPlans() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            const snap = await adminDb.collection('plans').where('gymId', '==', gymId).get()
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.price - b.price);
        }
    }
    return [];
}

export async function createPlan(planData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const payload = {
                ...planData,
                price: parseFloat(planData.price) || 0,
                created_at: new Date().toISOString(),
                members: 0,
                features: planData.features ? planData.features.split(',').map(f => f.trim()) : []
            }
            const docRef = await adminDb.collection('plans').add(payload)
            revalidatePath('/plans')
            revalidatePath('/portal/membership')
            return { id: docRef.id, ...payload }
        }
    }
    return planData;
}

export async function updatePlan(id, planData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const payload = {
                name: planData.name,
                price: parseFloat(planData.price) || 0,
                color: planData.color || '#ef4444',
                popular: planData.popular || false,
                updated_at: new Date().toISOString()
            }
            if (typeof planData.features === 'string') {
                payload.features = planData.features ? planData.features.split(',').map(f => f.trim()) : []
            } else if (Array.isArray(planData.features)) {
                payload.features = planData.features
            }
            await adminDb.collection('plans').doc(id).update(payload)
            revalidatePath('/plans')
            revalidatePath('/portal/membership')
            return { id, ...payload }
        }
    }
    return planData;
}

export async function deletePlan(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('plans').doc(id).delete()
            revalidatePath('/plans')
            revalidatePath('/portal/membership')
            return true
        }
    }
    return false;
}
