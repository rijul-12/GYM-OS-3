import { NextResponse } from 'next/server'

// -----------------------------------------------------------------------
// Routing middleware.
//
// This layer only decides where to send the browser. It reads the role claim
// from the session JWT WITHOUT verifying the signature (the Edge runtime has
// no Admin SDK), so it is a UX convenience and NOT a security boundary.
// Every Server Component and Server Action verifies the cookie with the
// Firebase Admin SDK before returning or changing any data.
// -----------------------------------------------------------------------

const SESSION_COOKIE = 'gymos_session'

const ROLE_HOMES = {
    super_admin: '/super-admin',
    owner: '/dashboard',
    trainer: '/trainer',
    member: '/portal',
}

const OWNER_PREFIXES = ['/dashboard', '/analytics', '/members', '/branding', '/plans', '/settings', '/occupancy', '/attendance-logs', '/attendance-integrations', '/attendance-sync', '/trainers', '/equipments', '/onboarding']

const startsWithSegment = (pathname, prefix) => pathname === prefix || pathname.startsWith(prefix + '/')

function readClaims(token) {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const json = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
        const claims = JSON.parse(json)
        if (!claims.exp || claims.exp * 1000 < Date.now()) return null
        if (!ROLE_HOMES[claims.role]) return null
        return { role: claims.role }
    } catch {
        return null
    }
}

export function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const session = token ? readClaims(token) : null

    const zone = {
        super_admin: startsWithSegment(pathname, '/super-admin'),
        owner: OWNER_PREFIXES.some(p => startsWithSegment(pathname, p)),
        trainer: startsWithSegment(pathname, '/trainer'),
        member: startsWithSegment(pathname, '/portal'),
    }
    const isProtected = zone.super_admin || zone.owner || zone.trainer || zone.member

    if (!session && isProtected) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        const res = NextResponse.redirect(loginUrl)
        if (token) res.cookies.delete(SESSION_COOKIE) // expired / legacy cookie
        return res
    }

    if (session) {
        const home = ROLE_HOMES[session.role]
        if (pathname === '/login') return NextResponse.redirect(new URL(home, request.url))
        if (zone.super_admin && session.role !== 'super_admin') return NextResponse.redirect(new URL(home, request.url))
        if (zone.owner && session.role !== 'owner') return NextResponse.redirect(new URL(home, request.url))
        if (zone.trainer && session.role !== 'trainer') return NextResponse.redirect(new URL(home, request.url))
        if (zone.member && session.role !== 'member') return NextResponse.redirect(new URL(home, request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|manifest.webmanifest).*)'],
}
