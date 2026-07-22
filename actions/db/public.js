'use server'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getLandingStats() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            try {
                const [gymsSnap, membersSnap, trainersSnap, checkinsSnap, qrSnap] = await Promise.all([
                    adminDb.collection('gyms').count().get(),
                    adminDb.collection('members').count().get(),
                    adminDb.collection('trainers').count().get(),
                    adminDb.collection('attendance').count().get(),
                    adminDb.collection('attendance').where('method', '==', 'QR code').count().get()
                ]);

                return {
                    gyms: gymsSnap.data().count || 0,
                    members: membersSnap.data().count || 0,
                    trainers: trainersSnap.data().count || 0,
                    checkins: checkinsSnap.data().count || 0,
                    qrCheckins: qrSnap.data().count || 0
                }
            } catch (e) {
                console.error("Landing Stats Fallback", e)
            }
        }
    }
    return { gyms: 0, members: 0, trainers: 0, checkins: 0, qrCheckins: 0 }
}

export async function getPublicGyms() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            try {
                // User Requirement: "only display gyms that have enabled Display my gym publicly inside Owner Settings"
                const settingsSnap = await adminDb.collection('gym_settings').where('publicDisplay', '==', true).get();
                const publicGymIds = settingsSnap.docs.map(d => d.id);

                if (publicGymIds.length > 0) {
                    const gymNames = [];
                    // Fetch in parallel
                    const gymDocs = await Promise.all(
                        publicGymIds.map(id => adminDb.collection('gyms').doc(id).get())
                    );

                    gymDocs.forEach(g => {
                        if (g.exists && g.data().name) {
                            gymNames.push(g.data().name.toUpperCase());
                        }
                    });

                    if (gymNames.length > 0) return gymNames;
                }
            } catch (e) {
                console.error("Public Gyms Fallback", e)
            }
        }
    }
    return []
}
