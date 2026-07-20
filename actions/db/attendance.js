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

    // Synthesize fallback offline list natively
    const names = ['Aarav Sharma', 'Vivaan Singh', 'Aditya Kumar', 'Vihaan Gupta', 'Arjun Patel', 'Sai Chander', 'Kabir Das', 'Reyansh Shetty', 'Rudransh Rao', 'Krishna Iyer', 'Ishaan Menon', 'Shaurya Mathur']
    return Array.from({ length: limit }).map((_, i) => ({
        id: `mock-att-${i}`,
        members: { name: names[i % names.length], photo_url: null, dob: '1995-03-12' },
        check_in_time: new Date(Date.now() - (Math.random() * 80000000)).toISOString(),
        method: 'Mock App'
    })).sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time))
}

export async function checkInMember(memberId, gymId, method = 'App') { return true; }
export async function checkOutMember(attendanceId) { return true; }

export async function markQrAttendance(gymCode) {
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

            // Duplicate check-in
            const activeLogs = await adminDb.collection('attendance')
                .where('member_id', '==', memberDoc.id)
                .where('check_out_time', '==', null)
                .get()

            if (!activeLogs.empty) {
                // Already checked in perfectly validly, but we shouldn't crash, just show welcome!
                return { success: true, message: 'Already checked in', gymId }
            }

            await adminDb.collection('attendance').add({
                member_id: memberDoc.id,
                gymId: gymId,
                check_in_time: new Date().toISOString(),
                check_out_time: null,
                method: 'QR',
                status: 'Active'
            })

            revalidatePath('/dashboard')
            return { success: true, gymId }
        }
    }

    // DEMO BYPASS
    if (gymCode === 'DEMO-CODE') return { success: true, gymId: 'DEMO' }
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
