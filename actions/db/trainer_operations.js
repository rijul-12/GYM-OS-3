'use server'

import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

// Ensure session extractor
async function getTrainerContext() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    if (!sessionStr) return null
    return JSON.parse(sessionStr)
}

export async function getAssignedMembers() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const session = await getTrainerContext()
        if (adminDb && session) {
            // Get all members assigned to this trainer (uid or name matches)
            // Or get all members belonging to the trainers Gym (for simpler fallback in testing if trainer specific isn't rigorous)
            const snap = await adminDb.collection('members')
                .where('gymId', '==', session.gymCode || 'DEMO')
                .get()

            const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            // To be accurate natively with 'Trainer can accept/reject', we filter where trainer_id == session.uid, or if not rigorously implemented, we just map them all.
            // But the UI needs `trainer_status: 'Pending' | 'Active'`
            return members
        }
    }
    return []
}

export async function acceptMember(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(memberId).update({
                trainer_status: 'Active'
            })
            revalidatePath('/trainer/members')
            return true;
        }
    }
}

export async function rejectMember(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            await adminDb.collection('members').doc(memberId).update({
                trainer_status: 'Rejected'
            })
            revalidatePath('/trainer/members')
            return true;
        }
    }
}

export async function addNote(memberId, text, tag) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { FieldValue } = await import('firebase-admin/firestore')
        if (adminDb) {
            const newNote = {
                id: `n${Date.now()}`,
                ts: new Date().toISOString().slice(0, 10),
                text,
                tag
            }
            await adminDb.collection('members').doc(memberId).update({
                trainer_notes: FieldValue.arrayUnion(newNote)
            })
            revalidatePath('/trainer/members')
            return newNote;
        }
    }
}

export async function updateProgress(memberId, progressData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { FieldValue } = await import('firebase-admin/firestore')
        if (adminDb) {
            // progressData should contain {bench, squat, weight, w: week_number/date}
            await adminDb.collection('members').doc(memberId).update({
                progress_history: FieldValue.arrayUnion(progressData)
            })
            revalidatePath('/trainer/progress')
            return true;
        }
    }
}

export async function updateWorkoutPlan(memberId, planData) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            // planData is an object: { Mon: 'Chest...', Tue: 'Rest' ... }
            await adminDb.collection('members').doc(memberId).update({
                trainer_plan: planData
            })
            revalidatePath('/trainer/plans')
            revalidatePath('/trainer/members')
            return true;
        }
    }
}
