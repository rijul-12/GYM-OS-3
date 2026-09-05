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

        // 1. Submit to Database
        await adminDb.collection('gym_feedback').add({
            ...payload,
            timestamp: new Date().toISOString(),
            status: 'unresolved'
        });

        // 2. Route Email Based on Role
        let targetEmail = 'rijul0027@gmail.com'; // Default to Super Admin (You)

        // If a Trainer or Member submits feedback, send it to the Gym Owner
        if (payload.role === 'trainer' || payload.role === 'member') {
            if (payload.gymCode && payload.gymCode !== 'DEMO') {
                const gymDoc = await adminDb.collection('gyms').doc(payload.gymCode).get();
                if (gymDoc.exists && gymDoc.data().ownerEmail) {
                    targetEmail = gymDoc.data().ownerEmail;
                }
            }
        }

        // 3. Dispatch Email Alert
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
            to: targetEmail,
            subject: `New BGM Feedback: ${payload.category}`,
            headline: `New ${payload.category}`,
            greeting: `Hello Admin,`,
            bodyHtml: `<p>A new feedback report was submitted for your gym by <strong>${payload.email || 'A user'}</strong> (${payload.role}).</p>
                       <p style="background: #111; color: #ddd; padding: 16px; border-radius: 8px; border: 1px solid #333; margin-top: 20px;">
                       "${payload.text}"
                       </p>`,
        }).catch(e => console.log('Silent failure on feedback email delivery', e));

        return true;
    } catch (e) {
        return false;
    }
}
