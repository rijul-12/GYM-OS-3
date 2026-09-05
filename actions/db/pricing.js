'use server'

import { adminDb } from '@/lib/firebase/server'

export async function getPlatformPricing() {
    // Fallback constants satisfying V1 Usage-based pricing bounds
    let config = {
        BASE_PLATFORM_FEE: 1999,
        ACTIVE_MEMBER_RATE: 20,
        CURRENCY: 'INR',
        LOCALE: 'en-IN'
    };

    // Allows future dynamic overrides by Super Admin
    if (adminDb) {
        try {
            const snap = await adminDb.collection('platform_settings').doc('pricing').get();
            if (snap.exists) {
                config = { ...config, ...snap.data() };
            }
        } catch (e) { }
    }
    return config;
}

export async function getBillableMemberCount(gymId) {
    if (!adminDb || !gymId || gymId === 'DEMO') return 0;

    let count = 0;
    try {
        const snap = await adminDb.collection('members')
            .where('gymId', '==', gymId)
            .where('status', '==', 'Active')
            .get();

        const now = new Date();

        snap.docs.forEach(doc => {
            const m = doc.data();

            // Primary Status Rejectors
            if (m.isDeleted || m.status === 'Cancelled' || m.status === 'Inactive' || m.status === 'Pending') return;

            // Trial / Free Rejector unless physically overriden
            if (m.isFree && !m.isExplicitlyBillable) return;
            if (m.plan && (m.plan.toLowerCase() === 'trial' || m.plan.toLowerCase() === 'free') && !m.isExplicitlyBillable) return;

            // Blank plan safeguard
            if (!m.plan) return;

            // Hard Temporal Expiry Check. Do not bill mathematically expired memberships
            const expiryStr = m.membershipExpiry || m.membership_expiry || m.expiryDate || m.expiry_date || m.valid_until;
            if (expiryStr) {
                const endDate = new Date(expiryStr);
                if (!isNaN(endDate.getTime()) && endDate < now) return;
            }

            count++;
        });
    } catch (e) {
        console.error("Pricing Engine Error (Member Count Integration):", e);
    }
    return count;
}

export async function getMonthlyGymOsCost(gymId) {
    const config = await getPlatformPricing();
    const count = await getBillableMemberCount(gymId);

    const baseFee = config.BASE_PLATFORM_FEE || 1999;
    const rate = config.ACTIVE_MEMBER_RATE || 20;

    const usageCost = count * rate;
    const totalCost = baseFee + usageCost;

    return {
        baseFee,
        rate,
        activePaidMembers: count,
        usageCost,
        totalCost,
        currency: config.CURRENCY
    };
}
