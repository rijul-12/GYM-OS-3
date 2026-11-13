'use server'

import { cookies } from 'next/headers'
import { adminDb } from '@/lib/firebase/server'
import { getSession, SESSION_COOKIE, UNAUTHORIZED, NO_DB } from '@/lib/server/session'

/**
 * Self-service account deletion.
 *   member / trainer → their own footprint (payment records are retained, anonymised)
 *   owner            → the whole gym, only after typing the exact gym name
 *   super admin      → not allowed here
 */
export async function deleteMyAccount(confirmation) {
    const session = await getSession()
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    if (session.role === 'super_admin') return { error: 'Super Admin accounts cannot be deleted from the app.' }

    if (session.role === 'owner') {
        const gym = await adminDb.collection('gyms').doc(session.gymId).get()
        const expected = gym.exists ? String(gym.data().gymName || gym.data().name || '').trim() : ''
        if (!expected || String(confirmation || '').trim() !== expected) {
            return { error: 'Type your gym name exactly to confirm. This deletes the gym, its members, trainers and attendance.' }
        }
    } else if (String(confirmation || '').trim().toUpperCase() !== 'DELETE') {
        return { error: 'Type DELETE to confirm.' }
    }

    try {
        const { deleteUserFootprint } = await import('@/lib/server/deletion')
        const result = await deleteUserFootprint(session.uid, { actor: session })
        if (!result.success) return { error: result.error }
        const cookieStore = await cookies()
        cookieStore.delete(SESSION_COOKIE)
        return { success: true, retained: 'Payment records are kept in anonymised form for accounting.' }
    } catch (e) {
        console.error('self deletion failed:', e.message)
        return { error: 'We could not delete your account. Please contact support.' }
    }
}
