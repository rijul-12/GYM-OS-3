import { NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/url-builder';

// Trainer invitation links land here. Nothing is changed by opening the link
// (mail scanners pre-fetch URLs): the trainer is sent to the registration form
// where they set a password, and only that submission accepts the invitation.
export async function GET(request) {
    const token = new URL(request.url).searchParams.get('t') || '';
    const target = new URL('/register', getAppUrl());
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
        const login = new URL('/login', getAppUrl());
        login.searchParams.set('error', 'This invitation link is not valid. Ask your gym owner to send a new one.');
        return NextResponse.redirect(login);
    }
    target.searchParams.set('role', 'trainer');
    target.searchParams.set('invite', token);
    return NextResponse.redirect(target);
}
