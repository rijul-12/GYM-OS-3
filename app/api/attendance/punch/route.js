import { NextResponse } from 'next/server'
import { authenticateDevice, recordHardwarePunch } from '@/lib/server/hardware'

export const dynamic = 'force-dynamic'

// Generic hardware punch endpoint.
//   POST /api/attendance/punch
//   Header:  x-api-key: <integration secret generated in Owner → Integrations>
//   Body:    { "biometricUserId": "1001", "timestamp": "2026-01-01T09:30:00+05:30", "device": "front-door" }
export async function POST(request) {
    const secret = request.headers.get('x-api-key') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const gymId = await authenticateDevice(secret)
    if (!gymId) return NextResponse.json({ success: false, error: 'Invalid or missing integration secret' }, { status: 401 })

    let body
    try { body = await request.json() } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

    const biometricUserId = body.biometricUserId ?? body.member_id ?? body.user_id ?? body.emp_code ?? body.userId
    const at = body.timestamp ?? body.checkInTime ?? body.punch_time ?? body.logDate ?? new Date().toISOString()
    if (!biometricUserId) return NextResponse.json({ success: false, error: 'biometricUserId is required' }, { status: 400 })

    try {
        const result = await recordHardwarePunch({ gymId, biometricUserId, at, device: body.device ?? body.deviceIdentifier, method: 'Hardware' })
        if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: 422 })
        return NextResponse.json({ success: true, action: result.action })
    } catch (e) {
        console.error('hardware punch failed:', e.message)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }
}
