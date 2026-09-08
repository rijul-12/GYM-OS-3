import { NextResponse } from 'next/server';
import { deleteUserFootprint } from '@/actions/db/deletion';
import { adminDb } from '@/lib/firebase/server';

// Protect the endpoint via simple internal secret verification
const DELETION_SECRET = process.env.FIREBASE_WEBHOOK_SECRET || 'bgm_cascade_internal_secret';

/**
 * Endpoint to catch deletions directly from Firebase (if routed through HTTP triggers)
 * Expects a POST payload with { uid, secret }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { uid, secret } = body;

        if (secret !== DELETION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        const result = await deleteUserFootprint(uid);

        if (result.success) {
            return NextResponse.json({ message: 'User footprint deleted successfully', log: result.log }, { status: 200 });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

    } catch (error) {
        console.error("Firebase Webhook Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
