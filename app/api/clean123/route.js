import { NextResponse } from 'next/server';
import { adminScanOrphans, executeOrphanCleanupServerAction } from '@/actions/db/reconciliation';

export async function GET() {
    try {
        const payload = await adminScanOrphans();
        const records = [...payload.owners, ...payload.members, ...payload.trainers];

        let removed = 0;
        for (const orphan of records) {
            await executeOrphanCleanupServerAction(orphan.uid);
            removed++;
        }

        return NextResponse.json({ success: true, removed });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
