import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/server'
import { FieldValue } from 'firebase-admin/firestore'

// Generate realistic date strings in ISO format
const now = new Date();
const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

export async function GET(req) {
    // Basic security block: only allow seeding in dev (or when manually hitting this endpoint if you want, but for now we trust it)
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Cannot seed in production environment' }, { status: 403 })
    }

    try {
        const gymId = 'gym-os-seed-facility';

        // 1. Create Plans
        const plans = [
            { name: 'Basic', price: 19.99, cycle: 'Monthly', features: ['Gym Access'], color: '#a3a3a3' },
            { name: 'Premium', price: 49.99, cycle: 'Monthly', features: ['Gym Access', 'Classes', 'Priority Support'], color: '#3b82f6', isPopular: true },
            { name: 'Elite', price: 99.99, cycle: 'Monthly', features: ['Gym Access', 'Classes', '1-on-1 PT', 'Spa'], color: '#8b5cf6' }
        ];

        for (const plan of plans) {
            await adminDb.collection('plans').doc(plan.name.toLowerCase()).set({
                ...plan,
                gymId,
                status: 'Active',
                createdAt: FieldValue.serverTimestamp()
            });
        }

        // 2. Create Trainers
        const trainers = [
            { name: 'Sarah Connor', specialty: 'Hypertrophy', phone: '555-0100', email: 'sarah@gymos.com', activeClients: 12, rating: 4.8 },
            { name: 'John Wick', specialty: 'Endurance', phone: '555-0101', email: 'john@gymos.com', activeClients: 8, rating: 4.9 },
            { name: 'Ellen Ripley', specialty: 'Mobility', phone: '555-0102', email: 'ellen@gymos.com', activeClients: 15, rating: 5.0 }
        ];

        let trainerIds = [];
        for (const tr of trainers) {
            const trRef = await adminDb.collection('trainers').add({
                ...tr,
                gymId,
                availability: 'Morning',
                status: 'Active',
                createdAt: FieldValue.serverTimestamp()
            });
            trainerIds.push(trRef.id);
        }

        // 3. Create Members
        const membersData = [
            { name: 'Alice Smith', email: 'alice@example.com', phone: '555-0200', plan: 'Premium', assignedTrainer: trainerIds[0], status: 'Active' },
            { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0201', plan: 'Basic', assignedTrainer: null, status: 'Active' },
            { name: 'Charlie Brown', email: 'charlie@example.com', phone: '555-0202', plan: 'Elite', assignedTrainer: trainerIds[1], status: 'Expiring' },
            { name: 'Diana Prince', email: 'diana@example.com', phone: '555-0203', plan: 'Premium', assignedTrainer: trainerIds[2], status: 'Active' },
            { name: 'Evan Wright', email: 'evan@example.com', phone: '555-0204', plan: 'Basic', assignedTrainer: null, status: 'Active' }
        ];

        let memberIds = [];
        for (const member of membersData) {
            const mRef = await adminDb.collection('members').add({
                ...member,
                gymId,
                joinedAt: lastMonth.toISOString(),
                createdAt: FieldValue.serverTimestamp(),
            });
            memberIds.push(mRef.id);
        }

        // 4. Create Active Attendance (Check-ins) to simulate "Live Floor"
        // 3 of 5 members inside
        const liveMembers = [membersData[0], membersData[1], membersData[3]];
        for (let i = 0; i < liveMembers.length; i++) {
            await adminDb.collection('attendance').add({
                gymId,
                member_id: memberIds[i],
                checkIn: new Date(now.getTime() - (i + 1) * 15 * 60000).toISOString(), // 15, 30, 45 mins ago
                checkOut: null,
                members: {
                    name: liveMembers[i].name,
                    email: liveMembers[i].email
                }
            });
        }

        // Add 1 completed check-in for today (out)
        await adminDb.collection('attendance').add({
            gymId,
            member_id: memberIds[4],
            checkIn: new Date(now.getTime() - 120 * 60000).toISOString(),
            checkOut: new Date(now.getTime() - 60 * 60000).toISOString(), // 1 hour ago
            members: { name: 'Evan Wright', email: 'evan@example.com' }
        });

        // Add dummy transactions to populate Revenue Analytics
        const transactions = [
            { amount: 19.99, member_id: memberIds[1], type: 'subscription' },
            { amount: 49.99, member_id: memberIds[0], type: 'subscription' },
            { amount: 99.99, member_id: memberIds[2], type: 'subscription' },
            { amount: 15.00, member_id: memberIds[1], type: 'addon' },
        ];

        for (const tx of transactions) {
            await adminDb.collection('transactions').add({
                ...tx,
                gymId,
                status: 'completed',
                createdAt: FieldValue.serverTimestamp() // Today
            });
        }

        return NextResponse.json({ success: true, message: 'Database successfully seeded with realistic sample data.' })
    } catch (error) {
        console.error('SEED ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
