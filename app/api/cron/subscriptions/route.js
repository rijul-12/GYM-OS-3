import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/server'
import { sendEmail, escapeHtml } from '@/lib/email'
import { getSubscriptionUrl, getPortalUrl } from '@/lib/url-builder'
import { notify } from '@/lib/server/notify'
import { getEffectiveStatus, daysUntilExpiry, MEMBER_STATUS } from '@/lib/domain/membership'
import { queryOpenSessions, closeStaleSessions, maxSessionMinutes } from '@/lib/server/live'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

// Daily job (Vercel Cron, see vercel.json):
//   1. BGM subscription / trial reminders to gym owners and expiry flagging
//   2. Membership expiry reminders to members (7, 3 and 1 day before)
//   3. Auto check-out of abandoned sessions
// Requires CRON_SECRET; without it the endpoint refuses to run.
export async function GET(req) {
    if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
    if (!adminDb) return NextResponse.json({ success: false, reason: 'Database not configured' }, { status: 500 })

    const now = Date.now()
    const report = { gyms: 0, ownerEmails: 0, markedExpired: 0, memberReminders: 0, memberEmails: 0, sessionsClosed: 0 }

    const [subsSnap, gymsSnap, settingsSnap] = await Promise.all([
        adminDb.collection('gym_subscriptions').get(),
        adminDb.collection('gyms').get(),
        adminDb.collection('gym_settings').get(),
    ])
    const gyms = Object.fromEntries(gymsSnap.docs.map(d => [d.id, d.data()]))
    const settings = Object.fromEntries(settingsSnap.docs.map(d => [d.id, d.data()]))

    // 1 — gym subscriptions
    for (const doc of subsSnap.docs) {
        const data = doc.data()
        const gym = gyms[doc.id]
        if (!gym || data.gymDeleted) continue
        report.gyms++
        const email = gym.email || gym.ownerEmail
        const isTrial = data.status === 'Trial'
        const target = isTrial ? data.trialEndDate : (data.status === 'Active' ? data.subscriptionExpiryDate : null)
        if (!target) continue
        const daysRemaining = Math.ceil((new Date(target).getTime() - now) / DAY_MS)
        const what = isTrial ? 'free trial' : 'subscription'

        let subject = null, body = null
        if (daysRemaining <= 0) {
            await doc.ref.update({ status: 'Expired', expiredAt: new Date().toISOString() })
            report.markedExpired++
            subject = `Your BGM ${what} has ended`
            body = `<p>Your BGM ${what} has ended and your account is now read-only. Renew to continue managing members, attendance and payments.</p>`
            await notify({ gymId: doc.id, targetRole: 'owner', title: 'Subscription expired', message: `Your BGM ${what} has ended. Renew to restore full access.`, url: '/dashboard/subscription' })
        } else if ([14, 7, 3, 1].includes(daysRemaining)) {
            subject = `Your BGM ${what} ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
            body = `<p>Your BGM ${what} for <strong>${escapeHtml(gym.gymName || gym.name || 'your gym')}</strong> ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now to avoid your account becoming read-only.</p>`
            await notify({ gymId: doc.id, targetRole: 'owner', title: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`, message: `Your BGM ${what} ends soon.`, url: '/dashboard/subscription' })
        }
        if (subject && email) {
            const res = await sendEmail({ to: email, subject, headline: subject, bodyHtml: body, button: { text: 'Manage subscription', url: getSubscriptionUrl() } })
            if (res.success) report.ownerEmails++
        }
    }

    // 2 + 3 — per gym: membership expiry reminders and stale sessions
    for (const gymId of Object.keys(gyms)) {
        const s = settings[gymId] || {}
        const tz = s.timezone || 'Asia/Kolkata'
        try {
            const open = await queryOpenSessions(gymId)
            report.sessionsClosed += await closeStaleSessions(open, maxSessionMinutes(s))
        } catch (e) { console.error('cron auto-checkout failed:', e.message) }

        if (s.notif_expiring === false) continue
        const membersSnap = await adminDb.collection('members').where('gymId', '==', gymId).where('status', '==', 'Active').get()
        const gymName = gyms[gymId].gymName || gyms[gymId].name || 'your gym'
        for (const m of membersSnap.docs) {
            const data = m.data()
            if (getEffectiveStatus(data, new Date(), tz) !== MEMBER_STATUS.ACTIVE) continue
            const left = daysUntilExpiry(data, new Date(), tz)
            if (left === null || ![7, 3, 1].includes(left)) continue
            const marker = `${data.expiryDate || ''}:${left}`
            if (data.lastExpiryReminder === marker) continue // already reminded for this stage
            await m.ref.update({ lastExpiryReminder: marker })
            await notify({ gymId, targetRole: 'member', targetMemberId: m.id, title: 'Membership expiring soon', message: `Your membership at ${gymName} expires in ${left} day${left === 1 ? '' : 's'}.`, url: '/portal/membership' })
            report.memberReminders++
            if (data.email) {
                const res = await sendEmail({
                    to: data.email, subject: `Your ${gymName} membership expires in ${left} day${left === 1 ? '' : 's'}`,
                    headline: 'Membership expiring soon', greeting: `Hi ${data.name || 'there'},`,
                    bodyHtml: `<p>Your membership at <strong>${escapeHtml(gymName)}</strong> expires in ${left} day${left === 1 ? '' : 's'}. Please renew at the front desk to keep checking in.</p>`,
                    button: { text: 'View my membership', url: getPortalUrl('/membership') },
                })
                if (res.success) report.memberEmails++
            }
        }
    }

    return NextResponse.json({ success: true, ...report })
}
