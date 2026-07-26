import { getSubscriptionStatus } from '@/actions/db/subscriptions';

const PLAN_LIMITS = {
    starter: 75,
    pro: 130,
    elite: 220,
    enterprise: 999999, // practically unlimited
    trial: 999999,      // everything unlocked during trial
};

const PLAN_FEATURES = {
    starter: ['live_traffic', 'qr_attendance', 'workout_schedule', 'basic_reports'],
    pro: ['starter', 'advanced_analytics', 'heatmaps', 'revenue', 'ai_insights', 'advanced_branding', 'push_notifications', 'biometric'],
    elite: ['pro', 'api_access', 'csv_export', 'pdf_export', 'advanced_reports'],
    enterprise: ['elite', 'multi_branch', 'whatsapp_integration'],
    trial: ['enterprise'] // trial unlocks everything
};

function resolveFeatures(planCode) {
    const rawFeatures = PLAN_FEATURES[planCode] || [];
    let resolved = [...rawFeatures];

    if (resolved.includes('enterprise')) {
        resolved = [...resolved, ...resolveFeatures('elite')];
    }
    if (resolved.includes('elite')) {
        resolved = [...resolved, ...resolveFeatures('pro')];
    }
    if (resolved.includes('pro')) {
        resolved = [...resolved, ...resolveFeatures('starter')];
    }
    return resolved;
}

export function getBasePlan(fullPlanName) {
    if (!fullPlanName) return 'starter';
    const lower = fullPlanName.toLowerCase();
    if (lower.includes('enterprise')) return 'enterprise';
    if (lower.includes('elite')) return 'elite';
    if (lower.includes('pro')) return 'pro';
    if (lower.includes('starter')) return 'starter';
    if (lower.includes('trial')) return 'trial';
    return 'starter'; // Safe fallback
}

export function getMemberLimit(planName, phase = 'Active') {
    if (phase === 'Trial') return PLAN_LIMITS['trial'];
    const base = getBasePlan(planName);
    return PLAN_LIMITS[base] || 75;
}

export function hasFeature(planName, featureKey) {
    const base = getBasePlan(planName);
    const features = resolveFeatures(base);
    return features.includes(featureKey);
}

/**
 * Backend utility to block unauthorized server actions natively.
 */
export async function requireFeature(gymId, featureKey) {
    const status = await getSubscriptionStatus(gymId);

    // Check global lock first
    if (status.currentPhase === 'Expired' && featureKey !== 'read_only') {
        throw new Error("Subscription Expired. Actions disabled.");
    }

    if (status.currentPhase === 'Pending_Payment') {
        throw new Error("Payment is currently confirming. Please wait.");
    }

    if (status.currentPhase === 'Trial') {
        return status; // Trial unlocks everything on the backend
    }

    const base = getBasePlan(status.plan);
    const hasAccess = hasFeature(base, featureKey);

    if (!hasAccess) {
        throw new Error(`Your current plan (${status.plan}) does not support this feature.`);
    }

    return status;
}
