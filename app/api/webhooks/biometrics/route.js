import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/server'
import { parseBiometricPayload } from '@/lib/biometrics/parser'
import { checkInMember } from '@/actions/db/attendance'

export async function POST(req) {
    try {
        const payload = await req.json()
        const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key')

        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Integration Secret' }, { status: 401 })
        }

        // Validate webhook sender against active Gym integrations via Firestore
        const settingsSnap = await adminDb.collection('gym_api_settings')
            .where('secret_key', '==', authHeader)
            .where('is_active', '==', true)
            .limit(1)
            .get()

        if (settingsSnap.empty) {
            return NextResponse.json({ error: 'Invalid or inactive integration secret' }, { status: 403 })
        }

        const settings = settingsSnap.docs[0].data()
        // Maintain legacy gym_id compat
        settings.gym_id = settings.gym_id || settings.gymId || settingsSnap.docs[0].id

        const standardizedEvent = parseBiometricPayload(settings.provider_name, payload)

        // Resolve the IoT biometric ID to a GymOS Member UUID
        const membersSnap = await adminDb.collection('members')
            .where('gymId', '==', settings.gym_id)
            .where('biometric_id', '==', standardizedEvent.hardwareId)
            .limit(1)
            .get()

        if (membersSnap.empty) {
            return NextResponse.json({ error: `Member mapping failure for hardware ID: ${standardizedEvent.hardwareId}` }, { status: 404 })
        }

        const member = membersSnap.docs[0]

        // Fire standardized Data Access Layer action 
        await checkInMember(member.id, settings.gym_id, settings.provider_name)

        return NextResponse.json({ success: true, message: 'Attendance recorded' }, { status: 200 })

    } catch (error) {
        console.error('Biostat Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
