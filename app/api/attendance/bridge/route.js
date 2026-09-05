import { NextResponse } from 'next/server';
import { processHardwareCheckin } from '@/actions/db/attendance';

export async function POST(request) {
    try {
        const payload = await request.json();
        const { gymCode, biometricUserId, checkInTime, deviceIdentifier, token } = payload;

        if (!gymCode || !biometricUserId || !checkInTime) {
            return NextResponse.json(
                { success: false, error: 'Missing required payload parameters (gymCode, biometricUserId, checkInTime)' },
                { status: 400 }
            );
        }

        // Ideally, cross-reference 'token' with a secure access key stored in the gym's database profile 
        // to prevent rogue check-ins. For this architectural MVP, we ensure the gymCode maps cleanly.

        // Ensure checkInTime is an ISO string standard format before passing downstream
        const validTime = new Date(checkInTime).toISOString();

        const result = await processHardwareCheckin(
            gymCode,
            biometricUserId,
            validTime,
            deviceIdentifier || 'Local-Desktop-Bridge',
            'Hardware Bridge'
        );

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Hardware event registered as [${result.action}] for User [${result.member?.first_name || biometricUserId}]`
            });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 404 });
        }

    } catch (error) {
        console.error("Bridge Webhook Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error processing Hardware payload' }, { status: 500 });
    }
}
