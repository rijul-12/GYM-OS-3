/**
 * Centralized BGM Transacitonal Email URL Builder
 * Used exclusively for generating verified, environment-safe Absolute URLs
 */

export function getAppUrl() {
    // 1. Specific Environment Override (highest precedence)
    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/$/, '');
    }

    // 2. Fallback to general NEXT_PUBLIC site config 
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }

    // 3. Fallback Vercel Production Environment
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    // 4. Fallback Vercel Preview Environment
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // 5. Fail Safely on strict Production missing APP_URL scenario
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            "CRITICAL EMAIL ROUTING ERROR: `APP_URL` environment variable is strictly missing in production. " +
            "Email dispatch safely aborted to prevent relative routing failures."
        );
    }

    // 6. Local Development Fallback
    return 'http://localhost:3000';
}

// -------------------------------------------------------------
// Transactional Routing Helpers 
// -------------------------------------------------------------

export function getLoginUrl() {
    return `${getAppUrl()}/login`;
}

export function getDashboardUrl() {
    return `${getAppUrl()}/dashboard`;
}

export function getSubscriptionUrl() {
    return `${getAppUrl()}/dashboard/subscription`;
}

export function getTrainerInviteUrl(token) {
    if (!token) throw new Error("Missing Token for Trainer Invite Builder");
    return `${getAppUrl()}/api/invite/trainer?t=${token}`;
}
