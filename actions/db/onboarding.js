'use server'

export async function completeOnboarding(payload) {
    const { adminDb } = await import('@/lib/firebase/server');
    if (!adminDb) return { success: true };
    const { cookies } = await import('next/headers');

    // Authenticate tenant context
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('gymos_session')?.value;
    if (!sessionStr) throw new Error("Unauthorized context");
    const session = JSON.parse(sessionStr);
    const gymCode = session.gymCode || 'DEMO';

    try {
        // 1. Commit Settings
        await adminDb.collection('gym_settings').doc(gymCode).set({
            logo: payload.logo || null,
            hours: payload.hours || {},
            equipment: payload.equipment || {},
            attendanceMode: payload.attendanceMode || 'Manual',
            onboarded: true
        }, { merge: true });

        // 2. Commit Bootstrap Plans via Batch
        if (payload.plans && payload.plans.length > 0) {
            const batch = adminDb.batch();
            payload.plans.forEach(plan => {
                const docRef = adminDb.collection('plans').doc();
                batch.set(docRef, {
                    ...plan,
                    price: parseFloat(plan.price) || 0,
                    gymId: gymCode,
                    members: 0,
                    features: plan.features ? plan.features.split(',').map(f => f.trim()) : [],
                    created_at: new Date().toISOString()
                });
            });
            await batch.commit();
        }

        return { success: true };
    } catch (err) {
        throw new Error("Critical fallback committing multi-step initialization." + err.message);
    }
}
