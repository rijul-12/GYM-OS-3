'use server'

import { revalidatePath } from 'next/cache'

const getAdminDb = async () => {
    try {
        const { adminDb } = await import('@/lib/firebase/server')
        return adminDb
    } catch {
        return null
    }
}

export async function getNotifications() {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in' }

    try {
        const adminDb = await getAdminDb()
        if (!adminDb) return { success: true, items: [] }

        const user = JSON.parse(sessionStr)
        const isOwner = user.role === 'owner' || user.role === 'super-admin'

        let snap;
        if (isOwner) {
            snap = await adminDb.collection('notifications')
                .where('gymId', '==', user.gymCode || 'DEMO')
                .where('targetRole', 'in', ['owner', 'all'])
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()
        } else {
            snap = await adminDb.collection('notifications')
                .where('targetEmail', '==', user.email)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()
        }

        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        return { success: true, items }
    } catch (e) {
        return { error: e.message, items: [] }
    }
}

export async function markAsRead(notificationId) {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in' }

    try {
        const adminDb = await getAdminDb()
        if (!adminDb) return { success: false }

        await adminDb.collection('notifications').doc(notificationId).update({
            read: true
        })

        revalidatePath('/dashboard')
        revalidatePath('/portal')
        return { success: true }
    } catch (e) {
        return { error: e.message }
    }
}

export async function markAllAsRead() {
    const { cookies } = await import('next/headers')
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) return { error: 'Not logged in' }

    try {
        const adminDb = await getAdminDb()
        if (!adminDb) return { success: false }

        const user = JSON.parse(sessionStr)
        const isOwner = user.role === 'owner' || user.role === 'super-admin'

        let snap;
        if (isOwner) {
            snap = await adminDb.collection('notifications')
                .where('gymId', '==', user.gymCode || 'DEMO')
                .where('targetRole', 'in', ['owner', 'all'])
                .where('read', '==', false)
                .get()
        } else {
            snap = await adminDb.collection('notifications')
                .where('targetEmail', '==', user.email)
                .where('read', '==', false)
                .get()
        }

        const batch = adminDb.batch()
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { read: true })
        })

        if (snap.docs.length > 0) {
            await batch.commit()
        }

        revalidatePath('/dashboard')
        revalidatePath('/portal')
        return { success: true }
    } catch (e) {
        return { error: e.message }
    }
}

export async function sendNotification({ gymId, targetEmail, targetRole, title, message, url }) {
    try {
        const adminDb = await getAdminDb()
        if (!adminDb) return { success: false }

        await adminDb.collection('notifications').add({
            gymId: gymId || 'DEMO',
            targetEmail: targetEmail || null,
            targetRole: targetRole || 'member',
            title,
            message,
            url: url || null,
            read: false,
            createdAt: new Date().toISOString()
        })
        return { success: true }
    } catch (e) {
        return { error: e.message }
    }
}
