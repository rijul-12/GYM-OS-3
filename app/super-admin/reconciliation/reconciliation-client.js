'use client'
import { deleteUserFootprint } from '@/actions/db/deletion';
import { adminScanOrphans } from '@/actions/db/reconciliation';
// Yes this file wraps the RPC calls 

export async function fetchOrphans() {
    return await adminScanOrphans();
}

export async function executeOrphanCleanup(uid) {
    // Wrap Server Action call securely preserving client boundaries
    const res = await callDeletionService(uid);
    return res;
}

async function callDeletionService(uid) {
    'use server'
    const { deleteUserFootprint } = await import('@/actions/db/deletion')
    return await deleteUserFootprint(uid)
}
