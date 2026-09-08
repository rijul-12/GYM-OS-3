'use client'
import { adminScanOrphans, executeOrphanCleanupServerAction } from '@/actions/db/reconciliation';

export async function fetchOrphans() {
    return await adminScanOrphans();
}

export async function executeOrphanCleanup(uid) {
    return await executeOrphanCleanupServerAction(uid);
}
