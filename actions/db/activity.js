'use server'

import { adminDb } from '@/lib/firebase/server'
import { getSession, plain } from '@/lib/server/session'
import { escapeHtml, SUPPORT_EMAIL } from '@/lib/email'

const LABELS = {
    MEMBER_CREATED: 'Member added', MEMBER_APPROVED: 'Member approved', MEMBER_DELETED: 'Member deleted',
    MEMBER_DEACTIVATED: 'Member deactivated', MEMBER_SUSPENDED: 'Membership suspended', MEMBER_CANCELLED: 'Membership cancelled',
    MEMBER_REACTIVATED: 'Member reactivated', MEMBERSHIP_RENEWED: 'Membership renewed', MEMBER_PAYMENT_RECORDED: 'Payment recorded',
    MEMBER_UPI_PAYMENT_PAID: 'UPI payment confirmed', MEMBER_UPI_PAYMENT_REJECTED: 'UPI payment rejected',
    TRAINER_INVITED: 'Trainer invited', TRAINER_APPROVED: 'Trainer approved', TRAINER_SUSPENDED: 'Trainer suspended', TRAINER_DELETED: 'Trainer removed',
    GYM_QR_REGENERATED: 'QR code regenerated', PAYMENT_SETTINGS_CHANGED: 'Payment settings changed', MEMBERS_IMPORTED: 'Members imported',
    GYM_SUBSCRIPTION_PAID: 'BGM subscription paid', SMS_CAMPAIGN_SENT: 'SMS campaign sent', INTEGRATION_SECRET_ROTATED: 'Integration key rotated',
    GYM_STATUS_CHANGED: 'Gym status changed', GYM_DELETED: 'Gym deleted', TRIAL_EXTENSION: 'Trial extended',
    SUBSCRIPTION_REQUEST_APPROVED: 'Subscription request approved', SUBSCRIPTION_REQUEST_REJECTED: 'Subscription request rejected',
    USER_FOOTPRINT_DELETED: 'Account deleted',
}

/** Recent audited activity: an owner sees their own gym, a Super Admin the platform. */
export async function getRecentActivity(_unused, limitAmount = 10) {
    const session = await getSession()
    if (!session || !adminDb) return []
    if (session.role !== 'owner' && session.role !== 'super_admin') return []
    const max = Math.min(Math.max(parseInt(limitAmount, 10) || 10, 1), 50)
    try {
        let docs
        if (session.role === 'super_admin') {
            docs = (await adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(max).get()).docs
        } else {
            const base = adminDb.collection('audit_logs').where('gymId', '==', session.gymId)
            try {
                docs = (await base.orderBy('timestamp', 'desc').limit(max).get()).docs
            } catch {
                docs = (await base.limit(300).get()).docs
                    .sort((a, b) => String(b.data().timestamp).localeCompare(String(a.data().timestamp))).slice(0, max)
            }
        }
        return plain(docs.map(d => {
            const a = d.data()
            return { id: d.id, actionType: LABELS[a.action] || String(a.action || 'Activity').replace(/_/g, ' ').toLowerCase(), actorRole: a.actorRole || 'system', gymId: a.gymId || null, timestamp: a.timestamp || null }
        }))
    } catch {
        return []
    }
}

/** Any signed-in user can send feedback; identity and gym come from the session. */
export async function submitFeedback(payload = {}) {
    const session = await getSession()
    if (!session || !adminDb) return false
    const text = String(payload.text || '').trim().slice(0, 2000)
    if (text.length < 3) return false
    const category = String(payload.category || 'Feedback').slice(0, 40)
    try {
        await adminDb.collection('gym_feedback').add({
            text, category, role: session.role, email: session.email, uid: session.uid, gymCode: session.gymId || null,
            page: String(payload.page || '').slice(0, 120), timestamp: new Date().toISOString(), status: 'unresolved',
        })

        // Trainers and members write to their gym owner; owners write to BGM support.
        let to = SUPPORT_EMAIL
        if ((session.role === 'trainer' || session.role === 'member') && session.gymId) {
            const gym = await adminDb.collection('gyms').doc(session.gymId).get()
            if (gym.exists && (gym.data().email || gym.data().ownerEmail)) to = gym.data().email || gym.data().ownerEmail
        }
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
            to, subject: `BGM feedback: ${category}`, headline: `New ${category}`,
            bodyHtml: `<p>Submitted by <strong>${escapeHtml(session.email)}</strong> (${escapeHtml(session.role)}).</p><p style="background:#111;color:#ddd;padding:16px;border-radius:8px;border:1px solid #333;">${escapeHtml(text)}</p>`,
        })
        return true
    } catch {
        return false
    }
}
