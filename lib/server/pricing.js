// BGM usage-based pricing (server only).
import { adminDb } from '@/lib/firebase/server'
import { isMembershipActive } from '@/lib/domain/membership'

export async function getPlatformPricing() {
    let config = { BASE_PLATFORM_FEE: 1999, ACTIVE_MEMBER_RATE: 20, REGISTRATION_FEE: 2999, CURRENCY: 'INR', LOCALE: 'en-IN' }
    if (adminDb) {
        try {
            const snap = await adminDb.collection('platform_settings').doc('pricing').get()
            if (snap.exists) config = { ...config, ...snap.data() }
        } catch { }
    }
    return config
}

/** Members that are billable this cycle: active, not expired, on a paid plan. */
export async function getBillableMemberCount(gymId, tz = 'Asia/Kolkata') {
    if (!adminDb || !gymId) return 0
    const snap = await adminDb.collection('members').where('gymId', '==', gymId).where('status', '==', 'Active').get()
    const now = new Date()
    let count = 0
    snap.docs.forEach(doc => {
        const m = doc.data()
        if (m.isDeleted) return
        if (m.isFree && !m.isExplicitlyBillable) return
        const plan = String(m.plan || '').toLowerCase()
        if (!plan) return
        if ((plan === 'trial' || plan === 'free') && !m.isExplicitlyBillable) return
        if (!isMembershipActive(m, now, tz)) return
        count++
    })
    return count
}

export async function computeMonthlyCost(gymId) {
    const config = await getPlatformPricing()
    const count = await getBillableMemberCount(gymId)
    const baseFee = Number(config.BASE_PLATFORM_FEE) || 1999
    const rate = Number(config.ACTIVE_MEMBER_RATE) || 20
    const usageCost = count * rate
    return { baseFee, rate, activePaidMembers: count, usageCost, totalCost: baseFee + usageCost, registrationFee: Number(config.REGISTRATION_FEE) || 2999, currency: config.CURRENCY }
}
