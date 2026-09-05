'use server'

import { revalidatePath } from 'next/cache'
import { logActivity } from './activity'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

const mockFirstNames = ["Rijul", "Arun", "Vikas", "Priya", "Neha", "Rohit", "Amit", "Kavya", "Rahul", "Sonia"]
const mockLastNames = ["Sharma", "Verma", "Singh", "Patel", "Gupta", "Kumar", "Iyer", "Nair", "Rao", "Das"]

export async function generateDemoGym(saEmail = "system@gymos.in") {
    if (!isFirebaseConfigured()) return false;

    try {
        const { adminDb } = await import('@/lib/firebase/server')

        // 1. Create a Demo Gym Record
        const gymCode = `DEMO-${Math.floor(Math.random() * 9000) + 1000}`
        await adminDb.collection('gyms').doc(gymCode).set({
            name: `BGM Global Demo (${gymCode})`,
            email: `demo@${gymCode.toLowerCase()}.com`,
            phone: '9876543210',
            location: 'Mumbai, IN',
            plan: 'enterprise',
            status: 'active',
            created_at: new Date().toISOString(),
            isDemo: true
        });

        // 2. Mock Owner 
        await adminDb.collection('users').doc(`owner_${gymCode}`).set({
            email: `demo@${gymCode.toLowerCase()}.com`,
            role: 'owner',
            name: 'Demo Owner',
            gymCode,
            status: 'active',
            created_at: new Date().toISOString()
        })

        // 3. Create 20 Mock Members
        const membersPromise = Array.from({ length: 20 }).map(async (_, i) => {
            const first = mockFirstNames[Math.floor(Math.random() * mockFirstNames.length)]
            const last = mockLastNames[Math.floor(Math.random() * mockLastNames.length)]
            const isActive = Math.random() > 0.15;

            return adminDb.collection('members').add({
                first_name: first,
                last_name: last,
                name: `${first} ${last}`,
                email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
                phone: `9198${Math.floor(Math.random() * 1000000)}`,
                gymId: gymCode,
                created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                is_active: isActive,
                status: isActive ? 'Active' : 'Unpaid',
                payment_status: isActive ? 'Paid' : 'Unpaid',
                plan: Math.random() > 0.5 ? 'Pro Plan' : 'Base Plan',
                stage: ['Cardio', 'Lifting', 'Recovery', 'Floor'][Math.floor(Math.random() * 4)],
                gender: Math.random() > 0.5 ? 'Male' : 'Female'
            })
        })

        await Promise.all(membersPromise)

        // 4. Log creation
        await logActivity(gymCode, 'super_admin', saEmail, 'Demo Created', `Generated 1-click Demo Gym: ${gymCode}`)

        revalidatePath('/super-admin/gyms')
        revalidatePath('/super-admin')
        return { success: true, gymCode }
    } catch (e) {
        console.error("Demo gen failed:", e)
        return { success: false, error: e.message }
    }
}
