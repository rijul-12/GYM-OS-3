'use server'

import { adminDb } from '@/lib/firebase/server'
import { authorize, UNAUTHORIZED, NO_DB } from '@/lib/server/session'
import { toMoney } from '@/lib/domain/membership'

/** Owner: finish first-time gym setup. Safe to submit twice (plans are not duplicated). */
export async function completeOnboarding(payload = {}) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const gymId = session.gymId

    try {
        const hours = {}
        if (payload.hours && typeof payload.hours === 'object') {
            for (const [day, v] of Object.entries(payload.hours).slice(0, 7)) {
                hours[String(day).slice(0, 12)] = { open: String(v?.open || '').slice(0, 5), close: String(v?.close || '').slice(0, 5), closed: !!v?.closed }
            }
        }
        const equipment = {}
        if (payload.equipment && typeof payload.equipment === 'object') {
            for (const [cat, items] of Object.entries(payload.equipment).slice(0, 20)) {
                if (Array.isArray(items)) equipment[String(cat).slice(0, 40)] = items.slice(0, 60).map(i => (typeof i === 'string' ? i.slice(0, 60) : { name: String(i?.name || '').slice(0, 60), qty: parseInt(i?.qty, 10) || 0 }))
            }
        }
        const mode = ['Manual', 'QR', 'Biometric'].includes(payload.attendanceMode) ? payload.attendanceMode : 'QR'
        const logo = typeof payload.logo === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(payload.logo) && payload.logo.length < 300000 ? payload.logo : null

        const existingPlans = await adminDb.collection('plans').where('gymId', '==', gymId).get()
        const existingNames = new Set(existingPlans.docs.map(d => String(d.data().name || '').toLowerCase()))

        const batch = adminDb.batch()
        batch.set(adminDb.collection('gym_settings').doc(gymId), { hours, equipment, attendanceMode: mode, ...(logo ? { logo } : {}), onboarded: true, onboardedAt: new Date().toISOString() }, { merge: true })

        const gymName = String(payload.gymInfo?.name || '').trim().slice(0, 80)
        if (gymName.length >= 2) {
            batch.set(adminDb.collection('gym_settings').doc(gymId), { gymName }, { merge: true })
            batch.update(adminDb.collection('gyms').doc(gymId), { gymName, name: gymName })
        }

        for (const plan of (Array.isArray(payload.plans) ? payload.plans : []).slice(0, 12)) {
            const name = String(plan?.name || '').trim().slice(0, 60)
            if (name.length < 2 || existingNames.has(name.toLowerCase())) continue
            existingNames.add(name.toLowerCase())
            batch.set(adminDb.collection('plans').doc(), {
                gymId, name, price: toMoney(plan.price), cycle: 'Monthly', color: '#ef4444', popular: false,
                features: typeof plan.features === 'string' ? plan.features.split(',').map(f => f.trim().slice(0, 80)).filter(Boolean).slice(0, 20) : [],
                created_at: new Date().toISOString(),
            })
        }
        await batch.commit()
        return { success: true }
    } catch (e) {
        console.error('onboarding failed:', e.message)
        return { error: 'We could not save your setup. Please try again.' }
    }
}
