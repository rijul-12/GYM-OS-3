import { NextResponse } from 'next/server'

const ROLE_HOMES = {
    super_admin: '/super-admin',
    owner: '/dashboard',
    trainer: '/trainer',
    member: '/portal',
}

export async function middleware(request) {
    const { pathname } = request.nextUrl

    // 🛑 Firebase Target: Supabase Cookie checking globally disabled preventing unwanted timeouts
    const response = NextResponse.next()

    // Step 2: Read our gymos_session cookie (works in both Demo Mode and Supabase Mode)
    const cookie = request.cookies.get('gymos_session')
    let session = null
    try {
        if (cookie?.value) session = JSON.parse(cookie.value)
    } catch { }

    // If session has expired, treat as logged out
    if (session?.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        session = null
    }

    // Protection route map
    const routes = {
        super_admin: pathname.startsWith('/super-admin'),
        owner: pathname.startsWith('/dashboard') || pathname.startsWith('/analytics') || pathname.startsWith('/members') || pathname.startsWith('/branding') || pathname.startsWith('/plans') || pathname.startsWith('/settings') || pathname.startsWith('/occupancy') || pathname.startsWith('/attendance-logs') || pathname.startsWith('/attendance-integrations') || pathname.startsWith('/attendance-sync') || pathname.startsWith('/trainers'),
        trainer: pathname.startsWith('/trainer'),
        member: pathname.startsWith('/portal'),
    }

    const isProtected = routes.super_admin || routes.owner || routes.trainer || routes.member

    // Not logged in — redirect to login
    if (!session && isProtected) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Already logged in — redirect away from root/login to role dashboard
    if (session && (pathname === '/' || pathname === '/login')) {
        const target = ROLE_HOMES[session.role]
        if (target) return NextResponse.redirect(new URL(target, request.url))
    }

    // Cross-role boundary enforcement
    if (session) {
        const role = session.role
        if (routes.super_admin && role !== 'super_admin') {
            return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/', request.url))
        }
        if (routes.owner && role !== 'owner' && role !== 'super_admin') {
            return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/', request.url))
        }
        if (routes.trainer && role !== 'trainer' && role !== 'owner') {
            return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/', request.url))
        }
        if (routes.member && role !== 'member') {
            return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/', request.url))
        }
    }

    // Pass through response
    return response
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|mock).*)'],
}
