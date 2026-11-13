// In-app notification writer (server only, not a Server Action).
import { adminDb } from '@/lib/firebase/server'

/**
 * Creates a notification.
 *   targetRole: 'owner' | 'trainer' | 'member' | 'all' | 'super_admin'
 *   targetUid / targetMemberId / targetEmail: optional — narrows to one person.
 * Never throws: a failed notification must not break the business operation.
 */
export async function notify({ gymId = null, targetRole, targetUid = null, targetMemberId = null, targetEmail = null, title, message, url = null }) {
    if (!adminDb || !title || !targetRole) return false
    try {
        await adminDb.collection('notifications').add({
            gymId,
            targetRole,
            targetUid,
            targetMemberId,
            targetEmail: targetEmail ? String(targetEmail).toLowerCase() : null,
            title: String(title).slice(0, 120),
            message: String(message || '').slice(0, 500),
            url: typeof url === 'string' && url.startsWith('/') ? url : null,
            read: false,
            readBy: [],
            createdAt: new Date().toISOString(),
        })
        return true
    } catch (e) {
        console.error('notification write failed:', e.message)
        return false
    }
}
