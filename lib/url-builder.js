/**
 * Centralised absolute URL builder for e-mails, SMS and notifications.
 * Customer-facing links always use the official production domain unless an
 * explicit APP_URL override is configured. Vercel preview hostnames are never
 * exposed to customers.
 */
export const OFFICIAL_APP_URL = 'https://gymos.app';

export function getAppUrl() {
    const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (explicit) return explicit.replace(/\/+$/, '');
    if (process.env.NODE_ENV === 'production') return OFFICIAL_APP_URL;
    return 'http://localhost:3000';
}

export const getLoginUrl = () => `${getAppUrl()}/login`;
export const getDashboardUrl = () => `${getAppUrl()}/dashboard`;
export const getSubscriptionUrl = () => `${getAppUrl()}/dashboard/subscription`;
export const getPortalUrl = (path = '') => `${getAppUrl()}/portal${path}`;

export function getRegisterUrl({ role, gymCode, email, invite } = {}) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (gymCode) params.set('gym', gymCode);
    if (email) params.set('email', email);
    if (invite) params.set('invite', invite);
    const qs = params.toString();
    return `${getAppUrl()}/register${qs ? `?${qs}` : ''}`;
}

export function getTrainerInviteUrl(token) {
    if (!token) throw new Error('Missing token for trainer invite URL');
    return `${getAppUrl()}/api/invite/trainer?t=${encodeURIComponent(token)}`;
}

/** Converts a Firebase action link into a link on our own domain. */
export function toAppActionUrl(firebaseLink, path) {
    const code = new URL(firebaseLink).searchParams.get('oobCode');
    if (!code) throw new Error('Firebase action link did not contain an oobCode');
    return `${getAppUrl()}${path}?oobCode=${encodeURIComponent(code)}`;
}
