import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('t');

    if (!id) {
        return NextResponse.json({ error: 'Invalid or missing invitation token.' }, { status: 400 });
    }

    try {
        const { adminDb } = await import('@/lib/firebase/server')
        if (!adminDb) return NextResponse.json({ error: 'Database disconnected' }, { status: 500 });

        const ref = adminDb.collection('trainers').doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Trainer invitation not found or has been revoked.' }, { status: 404 });
        }

        await ref.update({
            status: 'Active',
            is_active: true,
            rating: 5.0,
            updated_at: new Date().toISOString()
        });

        // Redirect to a success page or the GymOS login
        return NextResponse.redirect(new URL('/login?message=Trainer+Invite+Successfully+Accepted', request.url));
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to process invitation.' }, { status: 500 });
    }
}
