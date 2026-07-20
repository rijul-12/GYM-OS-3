'use server'
import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function logActivity(gymCode, actorRole, actorEmail, actionType, details) {
    if (!isFirebaseConfigured() || !gymCode) return false;

    try {
        const { adminDb } = await import('@/lib/firebase/server')
        await adminDb.collection('gym_activity_logs').add({
            gymCode,
            actorRole,
            actorEmail,
            actionType,
            details,
            timestamp: new Date().toISOString()
        });
        return true;
    } catch (e) {
        // Silently fail if activity log recording breaks so it does not interrupt core business logic
        return false;
    }
}

export async function getRecentActivity(gymCode, limitAmount = 10) {
    if (!isFirebaseConfigured() || !gymCode) return [];

    try {
        const { adminDb } = await import('@/lib/firebase/server')
        const snapshot = await adminDb.collection('gym_activity_logs')
            .where('gymCode', '==', gymCode)
            .orderBy('timestamp', 'desc')
            .limit(limitAmount)
            .get();

        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        return [];
    }
}

export async function submitFeedback(payload) {
    if (!isFirebaseConfigured()) return false;
    try {
        const { adminDb } = await import('@/lib/firebase/server')
        await adminDb.collection('gym_feedback').add({
            ...payload,
            timestamp: new Date().toISOString(),
            status: 'unresolved'
        });
        return true;
    } catch (e) {
        return false;
    }
}
