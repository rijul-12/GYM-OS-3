import { adminDb } from '@/lib/firebase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
    try {
        const { equipment, gymCode } = await req.json()

        if (!adminDb) {
            return NextResponse.json({ success: true, mock: true })
        }

        if (!gymCode) {
            return NextResponse.json({ error: 'Gym Code Missing' }, { status: 400 })
        }

        // Commit full equipment mapping sync natively
        await adminDb.collection('gym_settings').doc(gymCode).set({
            equipment: equipment
        }, { merge: true })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Equipment Sync Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
