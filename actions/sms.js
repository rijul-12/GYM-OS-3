'use server'

import { adminDb } from '@/lib/firebase/server'
import { authorize, getGymContext, gymDisplayName, audit, UNAUTHORIZED, NO_DB } from '@/lib/server/session'
import { loadLiveState } from '@/lib/server/live'
import { isMembershipActive } from '@/lib/domain/membership'
import { normalizePhone } from '@/lib/domain/phone'

// SMS provider used by this codebase: Twilio (REST API, no SDK).
// Required environment variables:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and one sender:
//   TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_PHONE_NUMBER
//
// India: promotional/transactional SMS to +91 numbers must be sent from a
// DLT-registered sender ID with a DLT-approved template. Until the Twilio
// account has that registration, Twilio/operators will reject or drop these
// messages — the per-message provider response below reports that honestly.

const MAX_RECIPIENTS = 500
const COOLDOWN_MS = 6 * 60 * 60 * 1000

function twilioConfig() {
    const cfg = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_PHONE_NUMBER,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    }
    const missing = []
    if (!cfg.accountSid) missing.push('TWILIO_ACCOUNT_SID')
    if (!cfg.authToken) missing.push('TWILIO_AUTH_TOKEN')
    if (!cfg.from && !cfg.messagingServiceSid) missing.push('TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER')
    return { ...cfg, missing }
}

const missingMessage = (missing) => `SMS is not configured.\n\nProvider: Twilio\nMissing environment variables:\n${missing.join('\n')}`

async function eligibleMembers(gymId, settings, gym, tz) {
    const [snap, live] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', gymId).where('status', '==', 'Active').get(),
        loadLiveState(gymId, { settings, gym, tz, closeStale: false }),
    ])
    const inside = new Set(live.live.map(s => s.member_id))
    const now = new Date()
    const seen = new Set()
    const out = []
    snap.docs.forEach(d => {
        const m = d.data()
        if (inside.has(d.id) || m.smsOptOut === true || !isMembershipActive(m, now, tz)) return
        const phone = normalizePhone(m.phone)
        if (!phone || seen.has(phone)) return
        seen.add(phone)
        out.push({ id: d.id, name: m.name || 'Member', phone })
    })
    return out
}

export async function getOffPeakEligibility() {
    const session = await authorize('owner')
    if (!session) return { error: UNAUTHORIZED.error }
    if (!adminDb) return { error: NO_DB.error }
    const cfg = twilioConfig()
    if (cfg.missing.length) return { error: missingMessage(cfg.missing), notConfigured: true, missing: cfg.missing }
    try {
        const { gym, settings, tz } = await getGymContext(session.gymId)
        const eligible = await eligibleMembers(session.gymId, settings, gym, tz)
        return {
            success: true,
            gymName: gymDisplayName(gym),
            eligibleCount: Math.min(eligible.length, MAX_RECIPIENTS),
            sampleMemberName: eligible.length > 0 ? eligible[0].name.split(' ')[0] : 'Member',
        }
    } catch (e) {
        return { error: 'Could not work out who is eligible.' }
    }
}

export async function blastOffPeakSMS() {
    const session = await authorize('owner')
    if (!session) return { error: UNAUTHORIZED.error }
    if (!adminDb) return { error: NO_DB.error }
    const cfg = twilioConfig()
    if (cfg.missing.length) return { error: missingMessage(cfg.missing), notConfigured: true, missing: cfg.missing }

    const gymId = session.gymId
    const { gym, settings, tz } = await getGymContext(gymId)

    // One campaign per gym per cool-down window; the lock also stops double clicks.
    const lockRef = adminDb.collection('gym_api_settings').doc(gymId)
    const locked = await adminDb.runTransaction(async (t) => {
        const snap = await t.get(lockRef)
        const last = snap.exists ? snap.data().lastSmsCampaignAt : null
        if (last && Date.now() - new Date(last).getTime() < COOLDOWN_MS) return last
        t.set(lockRef, { gymId, lastSmsCampaignAt: new Date().toISOString() }, { merge: true })
        return null
    })
    if (locked) {
        const next = new Date(new Date(locked).getTime() + COOLDOWN_MS)
        return { error: `An off-peak SMS was already sent recently. You can send the next one after ${next.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: tz })}.` }
    }

    try {
        const recipients = (await eligibleMembers(gymId, settings, gym, tz)).slice(0, MAX_RECIPIENTS)
        if (recipients.length === 0) {
            await lockRef.set({ lastSmsCampaignAt: null }, { merge: true })
            return { error: 'No eligible members with a valid phone number are away from the gym right now.' }
        }
        const gymName = gymDisplayName(gym)
        const auth = 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')
        const results = []

        for (const m of recipients) {
            const params = new URLSearchParams()
            params.append('To', m.phone)
            if (cfg.messagingServiceSid) params.append('MessagingServiceSid', cfg.messagingServiceSid)
            else params.append('From', cfg.from)
            params.append('Body', `Hi ${m.name.split(' ')[0]}, ${gymName} is quiet right now - a great time for your workout. - BGM`)
            try {
                const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
                    method: 'POST',
                    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                    signal: AbortSignal.timeout(10000),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) results.push({ m, status: 'REJECTED', error: `${data.code || res.status}: ${data.message || 'rejected by provider'}`, sid: null })
                else results.push({ m, status: 'ACCEPTED', error: null, sid: data.sid || null, providerStatus: data.status || 'queued' })
            } catch (err) {
                results.push({ m, status: 'FAILED', error: err.message, sid: null })
            }
        }

        for (let i = 0; i < results.length; i += 400) {
            const batch = adminDb.batch()
            results.slice(i, i + 400).forEach(r => batch.set(adminDb.collection('sms_logs').doc(), {
                gymId, recipient_id: r.m.id, recipient_phone: r.m.phone.replace(/\d(?=\d{4})/g, '•'),
                messageType: 'OFF_PEAK_PROMO', timestamp: new Date().toISOString(),
                providerStatus: r.status, providerError: r.error, gatewaySid: r.sid,
            }))
            await batch.commit()
        }

        const accepted = results.filter(r => r.status === 'ACCEPTED').length
        const rejected = results.length - accepted
        await audit(session, 'SMS_CAMPAIGN_SENT', { accepted, rejected })

        if (accepted === 0) {
            await lockRef.set({ lastSmsCampaignAt: null }, { merge: true }) // nothing went out: do not burn the cool-down
            return { error: `Twilio rejected every message. First error — ${results[0].error}. For Indian numbers the sender must be DLT registered.` }
        }
        // "Accepted" means Twilio queued the message; final delivery is reported by the operator later.
        return { success: true, deliveredCount: accepted, acceptedCount: accepted, rejectedCount: rejected, firstError: rejected ? results.find(r => r.status !== 'ACCEPTED').error : null }
    } catch (e) {
        await lockRef.set({ lastSmsCampaignAt: null }, { merge: true }).catch(() => { })
        return { error: 'The SMS campaign could not be sent.' }
    }
}
