'use server'

import { revalidatePath } from 'next/cache'

export async function blastOffPeakSMS() {
    const { adminDb } = await import('@/lib/firebase/server')
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    if (!sessionStr) throw new Error("Unauthorized");

    let gymId = 'DEMO'
    try { gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

    if (adminDb) {
        const snap = await adminDb.collection('members').where('gymId', '==', gymId).where('status', '==', 'Active').get();
        // Simulate network API delay for Twilio / SMS provider
        await new Promise(r => setTimeout(r, 1200));

        // Simulating that 2 members are inside, so others get it
        const offlineCount = Math.max(0, snap.docs.length - 2);

        return {
            success: true,
            deliveredCount: offlineCount
        };
    }

    return { success: false, error: 'Database disconnected' }
}
