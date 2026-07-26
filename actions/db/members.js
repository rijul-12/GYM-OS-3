'use server'


import { revalidatePath } from 'next/cache'

import { logActivity } from '@/actions/db/activity'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getMembers() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            const snap = await adminDb.collection('members').where('gymId', '==', gymId).get()
            return snap.docs.map(doc => {
                const d = JSON.parse(JSON.stringify(doc.data()))
                // Polyfilling relational structure visually preserving layout mapping entirely
                return { id: doc.id, ...d, trainers: { name: d.trainer_name || 'Unassigned' } }
            })
        }
    }

    // Fallback Mock Return
    return [];
}

export async function getMyProfile() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        if (!sessionStr) return null;

        try {
            const session = JSON.parse(sessionStr);
            const userEmail = session.email;
            const gymCode = session.gymCode;

            if (adminDb && userEmail) {
                const snap = await adminDb.collection('members')
                    .where('gymId', '==', gymCode)
                    .where('email', '==', userEmail)
                    .limit(1)
                    .get();

                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const profile = { id: doc.id, ...doc.data() };

                    const [workoutsSnap, attendanceSnap] = await Promise.all([
                        adminDb.collection('workout_logs').where('member_id', '==', doc.id).get(),
                        adminDb.collection('attendance').where('member_id', '==', doc.id).get()
                    ]);

                    profile.workout_logs = workoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    profile.attendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    profile.trainers = { name: profile.trainer_name || 'Unassigned' };

                    return JSON.parse(JSON.stringify(profile))
                }
            }
        } catch (e) { }
    }
    return null;
}

export async function getMemberProfile(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const profileDoc = await adminDb.collection('members').doc(memberId).get();
            if (!profileDoc.exists) {
                return null;
            }

            const profile = { id: profileDoc.id, ...profileDoc.data() };
            // Polyfill nested relational boundaries perfectly querying independently preserving NoSQL bounds
            const [workoutsSnap, attendanceSnap] = await Promise.all([
                adminDb.collection('workout_logs').where('member_id', '==', memberId).get(),
                adminDb.collection('attendance').where('member_id', '==', memberId).get()
            ]);

            profile.workout_logs = workoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            profile.attendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            profile.trainers = { name: profile.trainer_name || 'Unassigned' };

            return profile;
        }
    }

    return null;
}

export async function createMember(memberData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO', role = 'system', email = 'system'
        try {
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                gymId = session.gymCode || 'DEMO'
                role = session.role || 'system'
                email = session.email || 'system'
            }
        } catch (e) { }

        if (adminDb) {
            if (gymId !== 'DEMO') {
                const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
                const { getMemberLimit } = await import('@/lib/permissions');

                const subStatus = await getSubscriptionStatus(gymId);
                if (subStatus.currentPhase === 'Expired') {
                    throw new Error("Subscription Expired. Revert to Read-Only mode.");
                }

                const limit = getMemberLimit(subStatus.plan, subStatus.currentPhase);
                const querySnap = await adminDb.collection('members')
                    .where('gymId', '==', gymId)
                    .where('status', 'in', ['Active', 'Pending'])
                    .count().get();

                if (querySnap.data().count >= limit) {
                    throw new Error("You have reached your plan limit.");
                }
            }

            const payload = {
                ...memberData,
                gymId: gymId,
                created_at: new Date().toISOString(),
                is_active: true,
                bodyMeasurements: { weight: '', height: '', bodyFat: '' },
                bmi: null,
                goal: '',
                workoutSplit: '',
                schedule: '',
                preferredTime: '',
                medicalNotes: '',
                emergencyContact: '',
                trainer_name: 'Unassigned',
                trainer_id: null
            }
            const docRef = await adminDb.collection('members').add(payload)
            await logActivity(gymId, role, email, 'Member Created', `Added new member: ${memberData.first_name} ${memberData.last_name}`)
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return { id: docRef.id, ...payload }
        }
    }
    return memberData;
}
export async function updateMember(id, updates) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).set(updates, { merge: true })
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return { id, ...updates }
        }
    }
    return { id, ...updates };
}
export async function deleteMember(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).delete()
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return true
        }
    }
    return true;
}
export async function assignTrainerToMember(memberId, trainerId) { return true; }

export async function approveMember(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).update({
                is_active: true,
                status: 'Active'
            })
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return true
        }
    }
}

export async function deactivateMember(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).update({
                is_active: false,
                status: 'Inactive'
            })
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return true
        }
    }
}

export async function markPaymentPaid(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            // For rigorous tracking we could push to an array, but functionally we just increment expiry or switch status natively.
            await adminDb.collection('members').doc(id).update({
                payment_status: 'Paid',
                status: 'Active'
            })
            revalidatePath('/members')
            revalidatePath('/dashboard')
            return true
        }
    }
}
