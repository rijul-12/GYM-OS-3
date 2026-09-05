import { NextResponse } from 'next/server';
import { processHardwareCheckin } from '@/actions/db/attendance';

// ADMS expects a plaintext OK response to acknowledge receipt.
// If it receives 'OK', it will clear the log from its internal memory.
const ADMS_SUCCESS_RESPONSE = "OK";

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        // The biometric device passes its Serial Number securely in the query parameter (e.g. ?SN=XXX)
        const serialNumber = searchParams.get('SN') || 'Unknown-ZKTeco-Device';

        // ZKTeco can be configured to pass identifying logic via table name or custom query parameter.
        // For a SaaS platform like BGM where one server handles multiple gyms, 
        // the Gym Owner configures the machine's Cloud URL with their unique gymCode.
        // e.g. https://api.gymos.com/api/attendance/adms/iclock/cdata?SN=ABCD123&gymCode=SUPERGYM
        const gymCode = searchParams.get('gymCode');

        if (!gymCode) {
            return new NextResponse("ERROR: Missing gymCode mapping", { status: 400 });
        }

        // The body payload from ZKTeco is raw text, tab-separated or comma-separated depending on firmware.
        const bodyText = await request.text();
        const lines = bodyText.split('\n').filter(line => line.trim().length > 0);

        let successCount = 0;

        for (const line of lines) {
            // Standard ZKTeco Data Format: [User_PIN] [Date Time] [Verify_Mode] [InOut_Status]
            // Example: 1001\t2023-10-14 09:30:00\t1\t0
            const columns = line.split('\t');
            if (columns.length >= 2) {
                const biometricUserId = columns[0];
                let checkInTimeStr = columns[1];

                // Ensure valid ISO mapping or let the Date constructor naturally process the SQL-like format
                checkInTimeStr = checkInTimeStr.replace(' ', 'T');
                // Force to local offset or ISO string. Assuming the device sends local time.
                const checkInTime = new Date(checkInTimeStr).toISOString();

                // Intelligently route through our exact hardware commitment function
                const result = await processHardwareCheckin(
                    gymCode,
                    biometricUserId,
                    checkInTime,
                    serialNumber,
                    'ZKTeco ADMS'
                );

                if (result.success) {
                    successCount++;
                }
            }
        }

        // Always return plain OK so the physical machine releases the memory queue.
        return new NextResponse(ADMS_SUCCESS_RESPONSE, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });

    } catch (error) {
        console.error("ADMS Error:", error);
        return new NextResponse("ERROR", { status: 500 });
    }
}

export async function GET(request) {
    // Some ZKTeco firmware initializes with a GET handshake.
    // It pings the server to see if it's alive before sending POST data.
    return new NextResponse("OK", { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
