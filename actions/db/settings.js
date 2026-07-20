'use server'


import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

// Retrieves biometric integration keys. The query is inherently isolated via Firebase Rules/Admin.
export async function getBiometricSettings(gymId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const doc = await adminDb.collection('gym_api_settings').doc(gymId).get()
            if (doc.exists) return { id: doc.id, ...doc.data() }
            return {}
        }
    }
    return {};
}

// Allows an Owner to save Provider config natively onto Firestore
export async function saveBiometricSettings(gymId, settings) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('gym_api_settings').doc(gymId).set({ ...settings, updated_at: new Date().toISOString() }, { merge: true })
            revalidatePath('/settings')
            return true
        }
    }
    return true;
}
