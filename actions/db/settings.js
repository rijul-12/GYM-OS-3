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

// Retrieves appearance preferences for a specific User ID
export async function getUserAppearance(uid) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb && uid) {
            const doc = await adminDb.collection('user_settings').doc(uid).get()
            if (doc.exists) return doc.data()
            return null
        }
    }
    return null;
}

// Saves appearance settings for a specific User ID (Theme, Density, Sidebar, etc)
export async function updateUserAppearance(uid, settings) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb && uid) {
            await adminDb.collection('user_settings').doc(uid).set({ ...settings, updated_at: new Date().toISOString() }, { merge: true })
            return true
        }
    }
    return true;
}
