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

            // DUPLICATE PROTECTION: Verify identity does not already exist
            if (memberData.email) {
                const exists = await adminDb.collection('members')
                    .where('gymId', '==', gymId)
                    .where('email', '==', memberData.email).limit(1).get()
                if (!exists.empty) return { error: "Member already exists with this email." }
            }
            if (memberData.phone) {
                const existsPhone = await adminDb.collection('members')
                    .where('gymId', '==', gymId)
                    .where('phone', '==', memberData.phone).limit(1).get()
                if (!existsPhone.empty) return { error: "Member already exists with this phone number." }
            }

            const batch = adminDb.batch();
            const memberRef = adminDb.collection('members').doc();

            const payload = {
                gymId: gymId,
                name: memberData.name || '',
                email: memberData.email || '',
                phone: memberData.phone || '',
                dob: memberData.dob || '',
                gender: memberData.gender || 'Unknown',
                address: memberData.address || '',
                emergencyContact: memberData.emergencyContact || '',

                plan: memberData.plan || 'Base Member',
                status: memberData.membershipStatus || 'Pending',
                is_active: memberData.membershipStatus === 'Active',

                paymentFee: Number(memberData.paymentFee || 0),
                paymentAmount: Number(memberData.amountPaid || 0),
                outstandingAmount: Number(memberData.outstandingAmount || 0),
                payment_status: memberData.paymentStatus || 'Unpaid',
                paymentMethod: memberData.paymentMethod || 'Cash',

                created_at: memberData.startDate || new Date().toISOString(),
                expiryDate: memberData.expiryDate || null,

                workoutSplit: memberData.noFixedSchedule ? 'Flexible' : 'Preset Schedule',
                schedule: memberData.noFixedSchedule || !memberData.schedule ? 'Flexible' : memberData.schedule,
                preferredTime: memberData.preferredTime || '',
                goal: memberData.goal || 'General Health',

                bodyMeasurements: { weight: '', height: '', bodyFat: '' },
                bmi: null,
                medicalNotes: '',
                trainer_name: memberData.trainer_name || 'Unassigned',
                trainer_id: memberData.trainer_id || null
            };

            batch.set(memberRef, payload);

            if (payload.paymentAmount > 0) {
                const revRef = adminDb.collection('revenue_logs').doc();
                batch.set(revRef, {
                    gymId,
                    member_id: memberRef.id,
                    amount: payload.paymentAmount,
                    method: payload.paymentMethod,
                    status: payload.payment_status,
                    date: new Date().toISOString()
                });
            }

            const notifRef = adminDb.collection('notifications').doc();
            batch.set(notifRef, {
                gymId,
                targetEmail: payload.email,
                targetRole: 'member',
                title: 'Welcome to BGM',
                message: `Your membership for ${payload.plan} has been established.`,
                read: false,
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            await logActivity(gymId, role, email, 'Member Created', `Added new member: ${payload.name}`);

            revalidatePath('/members');
            revalidatePath('/portal');
            revalidatePath('/portal/membership');
            revalidatePath('/dashboard');

            return { success: true, id: memberRef.id, ...payload };
        }
    }
    return { error: "Database not connected" };
}
export async function updateMember(id, updates) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).set(updates, { merge: true })
            revalidatePath('/members')
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
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
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
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
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
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
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
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
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
            revalidatePath('/dashboard')
            return true
        }
    }
}

export async function reactivateMember(id) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).update({
                is_active: true,
                status: 'Active'
            })
            revalidatePath('/members')
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
            revalidatePath('/dashboard')
            return true
        }
    }
}

export async function updateMemberPlan(id, newPlanName) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(id).update({
                plan: newPlanName,
            })
            revalidatePath('/members')
            revalidatePath('/portal')
            revalidatePath('/portal/membership')
            revalidatePath('/dashboard')
            return true
        }
    }
}
