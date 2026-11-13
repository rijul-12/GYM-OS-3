import { NextResponse } from 'next/server';
import { authenticateDevice, recordHardwarePunch } from '@/lib/server/hardware';

export const dynamic = 'force-dynamic';

// ZKTeco / eSSL ADMS push endpoint.
// Configure the device's cloud server URL as:
//   https://gymos.app/api/attendance/adms/iclock/cdata?key=<integration secret>
// The device appends its own ?SN=<serial>. Requests without a valid key are rejected.
const text = (body, status = 200) => new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain' } });

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const gymId = await authenticateDevice(searchParams.get('key'));
    if (!gymId) return text('ERROR: unauthorized', 401);

    const serialNumber = (searchParams.get('SN') || 'ADMS-device').slice(0, 60);
    try {
        const bodyText = await request.text();
        const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 500);
        for (const line of lines) {
            // [User_PIN]\t[YYYY-MM-DD HH:mm:ss]\t[Verify_Mode]\t[InOut_Status] — device local time (IST assumed)
            const columns = line.split('\t');
            if (columns.length < 2) continue;
            const at = new Date(columns[1].trim().replace(' ', 'T') + '+05:30');
            if (isNaN(at.getTime())) continue;
            await recordHardwarePunch({ gymId, biometricUserId: columns[0], at: at.toISOString(), device: serialNumber, method: 'ZKTeco ADMS' }).catch(() => { });
        }
        // Plain OK tells the device to release its buffered records.
        return text('OK');
    } catch (error) {
        console.error('ADMS error:', error.message);
        return text('ERROR', 500);
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const gymId = await authenticateDevice(searchParams.get('key'));
    if (!gymId) return text('ERROR: unauthorized', 401);
    return text('OK');
}
