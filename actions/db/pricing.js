'use server'

import { adminDb } from '@/lib/firebase/server'
import { getSession } from '@/lib/server/session'
import { computeMonthlyCost } from '@/lib/server/pricing'

/** Monthly BGM cost for the caller's gym (Super Admin may pass a gym id). */
export async function getMonthlyGymOsCost(gymIdParam) {
    const session = await getSession()
    if (!session || !adminDb) return null
    const gymId = session.role === 'super_admin' ? gymIdParam : (session.role === 'owner' ? session.gymId : null)
    if (!gymId) return null
    return computeMonthlyCost(gymId)
}
