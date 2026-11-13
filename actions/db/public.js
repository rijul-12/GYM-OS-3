'use server'

import { adminDb } from '@/lib/firebase/server'

// Public, unauthenticated landing-page data. Only aggregate counts and the
// names of gyms that explicitly opted in to public display are exposed.

export async function getLandingStats() {
    const zero = { gyms: 0, members: 0, trainers: 0, checkins: 0, qrCheckins: 0 }
    if (!adminDb) return zero
    try {
        const [gyms, members, trainers, checkins, qr] = await Promise.all([
            adminDb.collection('gyms').where('status', '==', 'Active').count().get(),
            adminDb.collection('members').count().get(),
            adminDb.collection('trainers').count().get(),
            adminDb.collection('attendance').count().get(),
            adminDb.collection('attendance').where('method', '==', 'QR').count().get(),
        ])
        return { gyms: gyms.data().count, members: members.data().count, trainers: trainers.data().count, checkins: checkins.data().count, qrCheckins: qr.data().count }
    } catch (e) {
        console.error('landing stats failed:', e.message)
        return zero
    }
}

export async function getPublicGyms() {
    if (!adminDb) return []
    try {
        const settingsSnap = await adminDb.collection('gym_settings').where('publicDisplay', '==', true).limit(30).get()
        if (settingsSnap.empty) return []
        const gymDocs = await Promise.all(settingsSnap.docs.map(d => adminDb.collection('gyms').doc(d.id).get()))
        return gymDocs
            .filter(g => g.exists && String(g.data().status || 'Active') === 'Active' && !g.data().isDemo)
            .map(g => String(g.data().gymName || g.data().name || '').toUpperCase())
            .filter(Boolean)
    } catch (e) {
        console.error('public gyms failed:', e.message)
        return []
    }
}
