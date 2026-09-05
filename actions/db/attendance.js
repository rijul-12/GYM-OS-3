'use server'


import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getAttendanceLogs(limit = 50) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            const snap = await adminDb.collection('attendance').where('gymId', '==', gymId).get()

            // Sort in memory to avoid needing a Firestore Composite Index
            const sortedDocs = snap.docs.sort((a, b) => {
                const aTime = new Date(a.data().checkIn || a.data().check_in_time).getTime();
                const bTime = new Date(b.data().checkIn || b.data().check_in_time).getTime();
                return bTime - aTime;
            }).slice(0, limit);

            return sortedDocs.map(doc => {
                const d = JSON.parse(JSON.stringify(doc.data()))
                // Safely shim the recursive Supabase member join mapping cleanly to NoSQL Document structures
                return {
                    id: doc.id,
                    ...d,
                    check_in_time: d.checkIn || d.check_in_time,
                    members: {
                        name: d.members?.name || d.member_name || 'Guest',
                        photo_url: d.members?.photo_url || d.member_photo || null,
                        dob: d.member_dob || '2000-01-01'
                    }
                }
            })
        }
    }

    return [];
}

export async function checkInMember(memberId, gymId, method = 'App') { return true; }
export async function checkOutMember(attendanceId) { return true; }

export async function getAttendancePreCheck(gymCode) {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in', requireLogin: true }

    let user;
    try { user = JSON.parse(sessionStr) } catch (e) { return { error: 'Invalid session' } }

    if (!user || user.role !== 'member') {
        return { error: 'Only members can check-in via QR' }
    }

    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            // Check Gym validity by QR Code
            const gyms = await adminDb.collection('gyms').where('gymCode', '==', gymCode).limit(1).get()
            if (gyms.empty) return { error: 'This QR Code is no longer valid. Please contact your gym.' }

            const gym = gyms.docs[0].data()
            const gymId = gyms.docs[0].id

            // Identify Member
            const members = await adminDb.collection('members').where('email', '==', user.email).limit(1).get()
            if (members.empty) return { error: 'Member profile not found.' }
            const memberDoc = members.docs[0]
            const member = memberDoc.data()

            // Verification
            if (member.gymId !== gymId) return { error: 'You do not belong to this gym.' }
            if (gym.status !== 'Active') return { error: 'Gym is not currently active.' }
            if (member.membershipStatus && member.membershipStatus.toLowerCase() !== 'active') {
                return { error: 'Membership is inactive or expired.' }
            }

            // Duplicate check-in / Orphan Purge Evaluation
            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', memberDoc.id)
                .where('check_out_time', '==', null)
                .get()

            let legitimatelyInside = false;
            if (!activeLogs.empty) {
                const batch = adminDb.batch()
                let didPurgeOld = false;
                const now = new Date()

                activeLogs.docs.forEach(doc => {
                    const data = doc.data()
                    const checkInTime = new Date(data.check_in_time || data.checkIn)
                    // If log is older than 14 hours, it's an orphaned abandoned check-in. Auto-clear it!
                    if ((now - checkInTime) > (14 * 60 * 60 * 1000)) {
                        batch.update(doc.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Auto-Cleared' })
                        didPurgeOld = true;
                    } else {
                        legitimatelyInside = true;
                    }
                })

                if (didPurgeOld) await batch.commit()
            }

            if (legitimatelyInside) {
                return { success: true, message: 'Already checked in', gymId }
            }

            // Resolve explicit timezone instead of blind Server UTC offsets
            const settings = await adminDb.collection('gym_settings').doc(gymId).get()
            const tz = settings.exists ? settings.data().timezone || 'Asia/Kolkata' : 'Asia/Kolkata'
            const todayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date())

            let plannedWorkout = []
            if (member.noFixedSchedule === true || member.schedule === 'Flexible') {
                plannedWorkout = [];
            } else if (member.schedule && member.schedule[todayName]) {
                const s = member.schedule[todayName];
                // Splits might be comma separated "Chest, Triceps"
                plannedWorkout = Array.isArray(s) ? s : s.split(',').map(x => x.trim()).filter(Boolean)
            }

            return {
                success: true,
                gymId,
                memberId: memberDoc.id,
                plannedWorkout,
                noFixedSchedule: member.noFixedSchedule === true
            }
        }
    }

    // DEMO BYPASS
    if (gymCode === 'DEMO-CODE') return { success: true, gymId: 'DEMO', plannedWorkout: ['Chest'], noFixedSchedule: false }
    return { error: 'This QR Code is no longer valid. Please contact your gym.' }
}

export async function markQrAttendance(gymCode, actualWorkout = [], plannedWorkout = []) {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in', requireLogin: true }

    let user;
    try { user = JSON.parse(sessionStr) } catch (e) { return { error: 'Invalid session' } }

    if (!user || user.role !== 'member') {
        return { error: 'Only members can check-in via QR' }
    }

    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            // Check Gym validity by QR Code
            const gyms = await adminDb.collection('gyms').where('gymCode', '==', gymCode).limit(1).get()
            if (gyms.empty) return { error: 'This QR Code is no longer valid. Please contact your gym.' }

            const gymId = gyms.docs[0].id

            // Identify Member
            const members = await adminDb.collection('members').where('email', '==', user.email).limit(1).get()
            if (members.empty) return { error: 'Member profile not found.' }
            const memberDoc = members.docs[0]

            // Check for orphaned/duplicate check-ins and gracefully close them out instead of blocking the new check-in request
            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', memberDoc.id)
                .where('check_out_time', '==', null)
                .get()

            if (!activeLogs.empty) {
                const batch = adminDb.batch()
                activeLogs.docs.forEach(doc => {
                    batch.update(doc.ref, { check_out_time: new Date().toISOString(), status: 'Completed', method_out: 'Auto-Cleared' })
                })
                await batch.commit()
            }

            try {
                const docRef = await adminDb.collection('attendance').add({
                    member_id: memberDoc.id,
                    member_name: memberDoc.data().name || 'Member',
                    member_photo: memberDoc.data().photo_url || null,
                    gymId: gymId,
                    check_in_time: new Date().toISOString(),
                    check_out_time: null,
                    method: 'QR',
                    status: 'Active',
                    actual_workout: Array.isArray(actualWorkout) ? actualWorkout : [],
                    planned_workout: Array.isArray(plannedWorkout) ? plannedWorkout : []
                })

                if (!docRef || !docRef.id) {
                    throw new Error('Failed to create attendance document.');
                }

                revalidatePath('/dashboard')
                revalidatePath('/portal')
                revalidatePath('/occupancy')
                return { success: true, gymId, actualWorkout }
            } catch (err) {
                console.error("markQrAttendance Firebase Error:", err)
                return { error: 'Database sync failed: ' + err.message }
            }
        }
    }

    // DEMO BYPASS
    if (gymCode === 'DEMO-CODE') return { success: true, gymId: 'DEMO', actualWorkout }
    return { error: 'This QR Code is no longer valid. Please contact your gym.' }
}

export async function processAutoCheckout(gymId, timeoutMinutes) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const activeCheckins = await adminDb.collection('attendance')
                .where('gymId', '==', gymId)
                .where('check_out_time', '==', null)
                .get()

            const now = new Date()
            const batch = adminDb.batch()
            let count = 0

            activeCheckins.docs.forEach(doc => {
                const data = doc.data()
                const checkInTime = new Date(data.checkIn || data.check_in_time)
                const diffMins = (now - checkInTime) / 60000

                if (diffMins > timeoutMinutes) {
                    batch.update(doc.ref, { check_out_time: now.toISOString(), status: 'Completed', method_out: 'Auto' })
                    count++
                }
            })

            if (count > 0) await batch.commit()
            return count
        }
    }
    return 0
}

export async function getActiveCheckoutContext() {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in' }

    let user;
    try { user = JSON.parse(sessionStr) } catch (e) { return { error: 'Invalid session' } }

    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const members = await adminDb.collection('members').where('email', '==', user.email).limit(1).get()
            if (members.empty) return { error: 'Member not found.' }

            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', members.docs[0].id)
                .where('check_out_time', '==', null)
                .get()

            if (activeLogs.empty) return { error: 'No active attendance found.' }

            const data = activeLogs.docs[0].data();
            return {
                context: {
                    checkInTime: data.check_in_time || data.checkIn || new Date().toISOString(),
                    actualWorkout: data.actual_workout || 'General Fitness'
                }
            }
        }
    }
    return { error: 'Database unavailable' };
}

export async function markQrCheckout(gymCode) {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in' }

    let user;
    try { user = JSON.parse(sessionStr) } catch (e) { return { error: 'Invalid session' } }

    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const members = await adminDb.collection('members').where('email', '==', user.email).limit(1).get()
            if (members.empty) return { error: 'Member not found.' }

            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', members.docs[0].id)
                .where('check_out_time', '==', null)
                .get()

            if (activeLogs.empty) return { error: 'No active attendance found.' }

            const batch = adminDb.batch()
            activeLogs.docs.forEach(d => batch.update(d.ref, { check_out_time: new Date().toISOString(), status: 'Completed', method_out: 'QR' }))
            await batch.commit()

            revalidatePath('/dashboard')
            return { success: true }
        }
    }

    return { success: true }
}

export async function processHardwareCheckin(gymCode, biometricUserId, checkInTime, deviceIdentifier, method = 'Hardware') {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const gyms = await adminDb.collection('gyms').where('gymCode', '==', gymCode).limit(1).get()
            if (gyms.empty) return { error: `Invalid Gym Code` }
            const gymId = gyms.docs[0].id

            let memberDoc = null;
            try {
                const docRef = await adminDb.collection('members').doc(String(biometricUserId)).get();
                if (docRef.exists) memberDoc = docRef;
            } catch (e) { }

            if (!memberDoc) {
                const membersByBio = await adminDb.collection('members')
                    .where('gymId', '==', gymId)
                    .where('biometric_id', '==', String(biometricUserId))
                    .limit(1).get();
                if (!membersByBio.empty) memberDoc = membersByBio.docs[0];
            }

            if (!memberDoc) return { error: `Member mapping not found` }

            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', memberDoc.id)
                .where('check_out_time', '==', null)
                .get()

            if (!activeLogs.empty) {
                const logDoc = activeLogs.docs[0];
                const diffTime = new Date(checkInTime).getTime() - new Date(logDoc.data().check_in_time).getTime();
                if (diffTime > 60000) {
                    await logDoc.ref.update({
                        check_out_time: checkInTime,
                        status: 'Completed',
                        method_out: method
                    })
                    revalidatePath('/dashboard')
                    return { success: true, action: 'check-out' }
                } else {
                    return { success: true, action: 'ignored-bounce' }
                }
            }

            const member = memberDoc.data();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const todayName = dayNames[new Date(checkInTime).getDay()]
            let plannedWorkout = []
            if (member.weeklySchedule && member.weeklySchedule[todayName]) {
                const s = member.weeklySchedule[todayName]
                plannedWorkout = Array.isArray(s) ? s : [s].filter(Boolean)
            }

            await adminDb.collection('attendance').add({
                member_id: memberDoc.id,
                gymId: gymId,
                check_in_time: checkInTime,
                check_out_time: null,
                method: method,
                device: deviceIdentifier,
                status: 'Active',
                actual_workout: plannedWorkout,
                planned_workout: plannedWorkout
            });

            revalidatePath('/dashboard')
            return { success: true, action: 'check-in' }
        }
    }
    return { error: 'Database unavailable' }
}
