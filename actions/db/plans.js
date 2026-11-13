'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase/server'
import { getSession, authorize, getGymScopedDoc, UNAUTHORIZED, NO_DB, plain } from '@/lib/server/session'
import { assertGymWritable } from '@/lib/server/subscription'
import { toMoney } from '@/lib/domain/membership'

const CYCLES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']

function cleanPlan(input = {}) {
    const name = String(input.name || '').trim().slice(0, 60)
    if (name.length < 2) return { error: 'Plan name is required.' }
    const price = toMoney(input.price)
    if (price < 0 || price > 10000000) return { error: 'Plan price is not valid.' }
    let features = []
    if (typeof input.features === 'string') features = input.features.split(',')
    else if (Array.isArray(input.features)) features = input.features
    features = features.map(f => String(f).trim().slice(0, 80)).filter(Boolean).slice(0, 20)
    return {
        plan: {
            name, price, features,
            cycle: CYCLES.includes(input.cycle) ? input.cycle : 'Monthly',
            color: /^#[0-9a-fA-F]{6}$/.test(input.color || '') ? input.color : '#ef4444',
            popular: input.popular === true,
        },
    }
}

/** Membership plans of the caller's gym (owner, trainer and member may read). */
export async function getPlans() {
    const session = await getSession()
    if (!session || !adminDb || !session.gymId) return []
    const [snap, membersSnap] = await Promise.all([
        adminDb.collection('plans').where('gymId', '==', session.gymId).get(),
        session.role === 'owner' ? adminDb.collection('members').where('gymId', '==', session.gymId).select('plan', 'planId').get() : Promise.resolve(null),
    ])
    const counts = {}
    membersSnap?.docs.forEach(d => {
        const key = d.data().planId || String(d.data().plan || '').toLowerCase()
        counts[key] = (counts[key] || 0) + 1
    })
    return plain(snap.docs.map(d => {
        const p = d.data()
        return {
            id: d.id, name: p.name || '', price: toMoney(p.price), cycle: p.cycle || 'Monthly',
            features: Array.isArray(p.features) ? p.features : [], color: p.color || '#ef4444', popular: !!(p.popular || p.isPopular),
            members: session.role === 'owner' ? (counts[d.id] || 0) + (counts[String(p.name || '').toLowerCase()] || 0) : undefined,
        }
    }).sort((a, b) => a.price - b.price))
}

export async function createPlan(planData) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const writable = await assertGymWritable(session.gymId)
    if (!writable.ok) return { error: writable.error }
    const { plan, error } = cleanPlan(planData)
    if (error) return { error }

    const dup = await adminDb.collection('plans').where('gymId', '==', session.gymId).get()
    if (dup.docs.some(d => String(d.data().name || '').toLowerCase() === plan.name.toLowerCase())) return { error: 'A plan with this name already exists.' }

    const payload = { ...plan, gymId: session.gymId, created_at: new Date().toISOString() }
    const ref = await adminDb.collection('plans').add(payload)
    revalidatePath('/plans'); revalidatePath('/portal/membership')
    return plain({ id: ref.id, ...payload, members: 0 })
}

export async function updatePlan(id, planData) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('plans', id, session.gymId)
    if (!snap) return { error: 'Plan not found.' }
    const { plan, error } = cleanPlan({ ...snap.data(), ...planData })
    if (error) return { error }

    const oldName = snap.data().name
    await snap.ref.update({ ...plan, updated_at: new Date().toISOString() })
    if (oldName && oldName !== plan.name) {
        // Members store the plan name for display: keep it consistent after a rename.
        const members = await adminDb.collection('members').where('gymId', '==', session.gymId).where('plan', '==', oldName).get()
        for (let i = 0; i < members.docs.length; i += 400) {
            const batch = adminDb.batch()
            members.docs.slice(i, i + 400).forEach(d => batch.update(d.ref, { plan: plan.name, planId: id }))
            await batch.commit()
        }
    }
    revalidatePath('/plans'); revalidatePath('/portal/membership'); revalidatePath('/members')
    return plain({ id, ...plan })
}

export async function deletePlan(id) {
    const session = await authorize('owner')
    if (!session) return UNAUTHORIZED
    if (!adminDb) return NO_DB
    const snap = await getGymScopedDoc('plans', id, session.gymId)
    if (!snap) return { error: 'Plan not found.' }
    const [byId, byName] = await Promise.all([
        adminDb.collection('members').where('gymId', '==', session.gymId).where('planId', '==', id).limit(1).get(),
        adminDb.collection('members').where('gymId', '==', session.gymId).where('plan', '==', snap.data().name || '').limit(1).get(),
    ])
    if (!byId.empty || !byName.empty) return { error: 'Members are still on this plan. Move them to another plan first.' }
    await snap.ref.delete()
    revalidatePath('/plans'); revalidatePath('/portal/membership')
    return { success: true }
}
