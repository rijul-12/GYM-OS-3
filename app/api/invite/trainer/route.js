import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('t');

    if (!id) {
        return NextResponse.json({ error: 'Invalid or missing invitation token.' }, { status: 400 });
    }

    try {
        const { adminDb } = await import('@/lib/firebase/server')
        if (!adminDb) return NextResponse.redirect(new URL('/login?error=Backend+Database+Disconnected', request.url));

        const ref = adminDb.collection('trainers').doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return NextResponse.redirect(new URL('/login?error=Trainer+invitation+expired+or+revoked.+Please+request+a+new+one.', request.url));
        }

        await ref.update({
            status: 'Active',
            is_active: true,
            rating: 5.0,
            updated_at: new Date().toISOString()
        });

        return NextResponse.redirect(new URL('/login?message=Trainer+Invite+Successfully+Accepted!+Please+login.', request.url));
    } catch (e) {
        console.error(e);
        return NextResponse.redirect(new URL('/login?error=Internal+Server+Action+Failed.+Contact+Support.', request.url));
    }
}
