'use server'

import { revalidatePath } from 'next/cache'

const getAdminDb = async () => {
    try {
        const { adminDb } = await import('@/lib/firebase/server')
        return adminDb
    } catch {
        return null
    }
}

export async function getOffPeakEligibility() {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: "Unauthorized" };

    try {
        const user = JSON.parse(sessionStr)
        const gymId = user.gymCode || 'DEMO'

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            return {
                error: `SMS provider configured: Twilio\n\nMissing production environment variables:\n${!accountSid ? 'TWILIO_ACCOUNT_SID\n' : ''}${!authToken ? 'TWILIO_AUTH_TOKEN\n' : ''}${!fromNumber ? 'TWILIO_PHONE_NUMBER\n' : ''}`
            }
        }

        const adminDb = await getAdminDb()
        if (!adminDb) return { error: 'Database disconnected' }

        const gymSnap = await adminDb.collection('gyms').where('gymCode', '==', gymId).limit(1).get()
        const gymName = gymSnap.empty ? "Your Gym" : (gymSnap.docs[0].data().name || "Your Gym")

        // Fetch all active members in this gym who have a valid phone number
        const snap = await adminDb.collection('members')
            .where('gymId', '==', gymId)
            .where('status', '==', 'Active')
            .get();

        const allActive = snap.docs.map(d => ({ id: d.id, ...d.data() }))

        // Members eligible for SMS MUST have a phone number.
        const eligible = allActive.filter(m => m.phone && m.phone.length >= 7)

        // Then we subtract those currently checked in
        const activeLogs = await adminDb.collection('attendance')
            .where('gymId', '==', gymId)
            .where('check_out_time', '==', null)
            .get()

        const checkedInIds = new Set(activeLogs.docs.map(d => d.data().member_id))
        const offlineEligible = eligible.filter(m => !checkedInIds.has(m.id))

        return {
            success: true,
            gymName,
            eligibleCount: offlineEligible.length,
            sampleMemberName: offlineEligible.length > 0 ? offlineEligible[0].name.split(' ')[0] : 'Member'
        }

    } catch (e) {
        return { error: 'Failed to fetch eligibility' }
    }
}

export async function blastOffPeakSMS() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    if (!sessionStr) return { error: "Unauthorized" };

    try {
        const user = JSON.parse(sessionStr)
        const gymId = user.gymCode || 'DEMO'

        // Abort early with EXPLICIT Provider identification if the config is missing.
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            return {
                error: `SMS provider configured: Twilio\n\nMissing production environment variables:\n${!accountSid ? 'TWILIO_ACCOUNT_SID\n' : ''}${!authToken ? 'TWILIO_AUTH_TOKEN\n' : ''}${!fromNumber ? 'TWILIO_PHONE_NUMBER\n' : ''}`
            }
        }

        const adminDb = await getAdminDb()
        if (!adminDb) return { error: 'Database disconnected' }

        const gymSnap = await adminDb.collection('gyms').where('gymCode', '==', gymId).limit(1).get()
        const gymName = gymSnap.empty ? "BGM" : (gymSnap.docs[0].data().name || "BGM")

        // Find eligible batch
        const snap = await adminDb.collection('members').where('gymId', '==', gymId).where('status', '==', 'Active').get();
        const activeLogs = await adminDb.collection('attendance').where('gymId', '==', gymId).where('check_out_time', '==', null).get()
        const checkedInIds = new Set(activeLogs.docs.map(d => d.data().member_id))

        const offlineEligible = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(m => m.phone && m.phone.length >= 7 && !checkedInIds.has(m.id))

        if (offlineEligible.length === 0) {
            return { error: 'No eligible offline members found.' }
        }

        let deliveredMap = [];

        // Use native HTTP fetch to Twilio REST API since there are no NPM SDKs installed currently.
        for (const m of offlineEligible) {
            let internationalPhone = m.phone;
            // Basic formatting: assuming IN logic if missing code for basic SMS gateways
            if (!internationalPhone.startsWith('+')) internationalPhone = '+91' + internationalPhone;

            const messageBody = `Hi ${m.name.split(' ')[0]}, ${gymName} suggests a quieter workout period right now! The gym floor is currently calm. Check your BGM Portal for live intensity levels.`;

            const params = new URLSearchParams();
            params.append('To', internationalPhone);
            params.append('From', fromNumber);
            params.append('Body', messageBody);

            try {
                const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params.toString()
                });

                const dat = await twilioRes.json();

                if (!twilioRes.ok) {
                    throw new Error(dat.message || "Twilio rejected message");
                }

                deliveredMap.push({ m, status: 'DELIVERED', error: null, sid: dat.sid });
            } catch (err) {
                // If it fails completely, mark it FAILED and break or continue based on preference. 
                // We will continue to try the rest.
                deliveredMap.push({ m, status: 'FAILED', error: err.message });
            }
        }

        const fullyFailedCount = deliveredMap.filter(d => d.status === 'FAILED').length;
        if (fullyFailedCount === offlineEligible.length && fullyFailedCount > 0) {
            return { error: `Provider (Twilio) failed to deliver all messages. Error: ${deliveredMap[0].error}` }
        }

        // Create SMS logs
        const batch = adminDb.batch()
        const logCol = adminDb.collection('sms_logs')

        deliveredMap.forEach(d => {
            const entry = logCol.doc()
            batch.set(entry, {
                gymId,
                recipient_id: d.m.id,
                recipient_phone: d.m.phone,
                messageType: 'OFF_PEAK_PROMO',
                timestamp: new Date().toISOString(),
                providerStatus: d.status,
                providerError: d.error,
                gatewaySid: d.sid || null
            })
        })
        await batch.commit()

        return {
            success: true,
            deliveredCount: deliveredMap.filter(d => d.status === 'DELIVERED').length
        };
    } catch (e) {
        return { error: e.message }
    }
}
