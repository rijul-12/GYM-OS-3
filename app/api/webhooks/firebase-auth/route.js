import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { deleteUserFootprint } from '@/lib/server/deletion';
import { adminDb } from '@/lib/firebase/server';

export const dynamic = 'force-dynamic';

// Called by the Firebase Auth onDelete Cloud Function (see firebase/functions)
// so that deleting an account in Firebase Authentication also removes the
// user's application footprint.
//
//   POST { "uid": "<firebase uid>" }
//   Header: Authorization: Bearer <FIREBASE_WEBHOOK_SECRET>
//
// There is no default secret: without FIREBASE_WEBHOOK_SECRET the endpoint is disabled.
function authorised(request, bodySecret) {
    const expected = process.env.FIREBASE_WEBHOOK_SECRET;
    if (!expected || expected.length < 24) return false;
    const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || bodySecret || '';
    const a = Buffer.from(String(provided));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
    if (!process.env.FIREBASE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Endpoint disabled: FIREBASE_WEBHOOK_SECRET is not configured' }, { status: 503 });
    }
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!authorised(request, body?.secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!adminDb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    if (!body?.uid || typeof body.uid !== 'string') return NextResponse.json({ error: 'UID is required' }, { status: 400 });

    try {
        const result = await deleteUserFootprint(body.uid, { actor: { uid: 'auth-trigger', role: 'system' } });
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 });
        return NextResponse.json({ success: true, roles: result.roles });
    } catch (error) {
        console.error('auth deletion webhook failed:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
