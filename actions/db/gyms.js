'use server'


import { revalidatePath } from 'next/cache'


function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getGyms() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const snap = await adminDb.collection('gyms').get()
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
    }

    // Offline / Supabase Fallback Bypass
    return [];
}

export async function updateGymStatus(gymId, newStatus) {
    if (!isFirebaseConfigured()) return false;
    const { adminDb } = await import('@/lib/firebase/server');
    if (!adminDb) return false;

    try {
        await adminDb.collection('gyms').doc(gymId).update({ status: newStatus });
        revalidatePath('/super-admin/gyms');
        return true;
    } catch (e) {
        return false;
    }
}

export async function getGymSettings(gymId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const [settingsDoc, gymDoc] = await Promise.all([
                adminDb.collection('gym_settings').doc(gymId).get(),
                adminDb.collection('gyms').doc(gymId).get()
            ]);
            let result = {};
            if (settingsDoc.exists) result = { id: settingsDoc.id, ...settingsDoc.data() };
            if (gymDoc.exists) {
                const gData = gymDoc.data();
                result.gymName = gData.gymName || gData.name;
                result.ownerName = gData.ownerName;
            }
            return result;
        }
    }
    // Fallback Mock
    return {}
}

export async function deleteGym(gymId) {
    if (!isFirebaseConfigured()) return false;
    const { adminDb } = await import('@/lib/firebase/server');
    if (!adminDb) return false;

    try {
        await adminDb.collection('gyms').doc(gymId).delete();
        revalidatePath('/super-admin/gyms');
        revalidatePath('/super-admin');
        return true;
    } catch (e) {
        return false;
    }
}

export async function getTrainers() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        if (adminDb) {
            const snap = await adminDb.collection('trainers').get()
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
    }
    return [];
}

export async function getDashboardStats() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');

            const [memSnap, trnSnap, attSnap, settingsSnap, subStatus] = await Promise.all([
                adminDb.collection('members').where('gymId', '==', gymId).count().get(),
                adminDb.collection('trainers').where('gymId', '==', gymId).count().get(),
                adminDb.collection('attendance').where('gymId', '==', gymId).get(),
                adminDb.collection('gym_settings').doc(gymId).get(),
                getSubscriptionStatus(gymId)
            ])

            const totalMembers = memSnap.data().count;
            const totalTrainers = trnSnap.data().count;
            const currencyStr = settingsSnap.exists ? (settingsSnap.data().currency || '₹ INR') : '₹ INR';
            const currencySymbol = currencyStr.split(' ')[0];
            const capacity = settingsSnap.exists ? (settingsSnap.data().buildingCapacity || 100) : 100;

            const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
            const todayCheckins = attSnap.docs.filter(d => (d.data().checkIn || d.data().check_in_time) >= todayIso).length;

            const activeCheckins = attSnap.docs.filter(d => !d.data().checkOut && !d.data().check_out_time).map(d => d.data());
            const insideCount = activeCheckins.length;

            // Compute Intelligence securely without mock arrays
            const membersListDoc = await adminDb.collection('members').where('gymId', '==', gymId).get();
            const members = membersListDoc.docs.map(d => ({ id: d.id, ...d.data() }));

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            const getWorkoutForToday = (m) => {
                if (m.weeklySchedule && m.weeklySchedule[today]) return m.weeklySchedule[today];
                if (m.workout) return m.workout;
                if (m.primaryWorkoutSplit) return m.primaryWorkoutSplit;
                return 'Rest';
            }

            let chest = 0, back = 0, legs = 0, shoulders = 0, arms = 0, core = 0, cardio = 0, yoga = 0;
            activeCheckins.forEach(a => {
                let workoutArray = [];
                if (a.actual_workout && Array.isArray(a.actual_workout) && a.actual_workout.length > 0) {
                    workoutArray = a.actual_workout;
                } else if (a.actual_workout && typeof a.actual_workout === 'string') {
                    workoutArray = [a.actual_workout];
                } else {
                    const mId = a.memberId || a.member_id || (a.members && a.members.id);
                    const m = members.find(mbr => mbr.id === mId || mbr.name === (a.members && a.members.name)) || { workout: 'Rest' };
                    const w = getWorkoutForToday(m);
                    workoutArray = Array.isArray(w) ? w : [String(w)];
                }

                const wStr = workoutArray.join(' ').toLowerCase();

                if (wStr.includes('chest') || wStr.includes('push')) chest++;
                if (wStr.includes('back') || wStr.includes('pull')) back++;
                if (wStr.includes('leg')) legs++;
                if (wStr.includes('shoulder')) shoulders++;
                if (wStr.includes('arm') || wStr.includes('bicep') || wStr.includes('tricep')) arms++;
                if (wStr.includes('core') || wStr.includes('abs')) core++;
                if (wStr.includes('cardio') || wStr.includes('hiit')) cardio++;
                if (wStr.includes('yoga') || wStr.includes('flex')) yoga++;
                if (wStr.includes('full body')) { chest++; back++; legs++; shoulders++; core++; }
                if (wStr.includes('powerlifting')) { chest++; back++; legs++; }
            });

            // Map Zone Demands strictly for the GymOS Live Intelligence constraint!
            const max = Math.max(1, chest, back, legs, shoulders, arms, core, cardio);
            const getDem = (v) => Math.floor((v / Math.max(1, insideCount)) * 100);
            const getStatus = (v) => v > (insideCount * 0.4) && v > 1 ? 'Busy' : (v > 0 ? 'Medium' : 'Empty');

            const ZONES = [
                { id: 'z1', name: 'Chest Zone', members: chest, demand: getDem(chest), emoji: '💪', color: '#ef4444', status: getStatus(chest), bg: 'rgba(239,68,68,0.03)', border: 'rgba(239,68,68,0.1)' },
                { id: 'z2', name: 'Back Zone', members: back, demand: getDem(back), emoji: '🏋️', color: '#f97316', status: getStatus(back), bg: 'rgba(249,115,22,0.03)', border: 'rgba(249,115,22,0.1)' },
                { id: 'z3', name: 'Leg Zone', members: legs, demand: getDem(legs), emoji: '🦵', color: '#22c55e', status: getStatus(legs), bg: 'rgba(34,197,94,0.03)', border: 'rgba(34,197,94,0.1)' },
                { id: 'z4', name: 'Shoulder Zone', members: shoulders, demand: getDem(shoulders), emoji: '🎯', color: '#eab308', status: getStatus(shoulders), bg: 'rgba(234,179,8,0.03)', border: 'rgba(234,179,8,0.1)' },
                { id: 'z5', name: 'Arms Zone', members: arms, demand: getDem(arms), emoji: '💥', color: '#84cc16', status: getStatus(arms), bg: 'rgba(132,204,22,0.03)', border: 'rgba(132,204,22,0.1)' },
                { id: 'z6', name: 'Core Zone', members: core, demand: getDem(core), emoji: '🏃', color: '#3b82f6', status: getStatus(core), bg: 'rgba(59,130,246,0.03)', border: 'rgba(59,130,246,0.1)' },
            ];

            const str = chest + back + legs + shoulders + arms;
            const WORKOUT_DIST = [
                { name: 'Strength Training', value: str || 0, color: '#ef4444' },
                { name: 'Cardio Core', value: (cardio + core) || 0, color: '#3b82f6' },
                { name: 'Flexibility / Yoga', value: yoga || 0, color: '#10b981' }
            ].filter(d => d.value > 0);
            if (WORKOUT_DIST.length === 0) WORKOUT_DIST.push({ name: 'Idle', value: 1, color: '#64748b' });

            const todayStr = new Date().toISOString().split('T')[0];
            const hourly = {};
            attSnap.docs.forEach(d => {
                const t = new Date(d.data().checkIn || d.data().check_in_time);
                if (t.toISOString().startsWith(todayStr)) {
                    hourly[t.getHours()] = (hourly[t.getHours()] || 0) + 1;
                }
            });
            const ATTENDANCE_DAILY = Array.from({ length: 15 }).map((_, i) => ({
                hour: `${i + 6}am`,
                v: hourly[i + 6] || 0,
                forecast: Math.floor(capacity * 0.15)
            }));

            // Map Busy/Quiet metrics
            let busyHr = 18, peakV = 0, quietHr = 6, minV = 9999;
            Object.keys(hourly).forEach(h => {
                if (hourly[h] > peakV) { peakV = hourly[h]; busyHr = h; }
                if (hourly[h] < minV && hourly[h] > 0) { minV = hourly[h]; quietHr = h; }
            });
            const bFmt = `${busyHr > 12 ? busyHr - 12 : busyHr}:00 ${busyHr >= 12 ? 'PM' : 'AM'}`;
            const qFmt = `${quietHr > 12 ? quietHr - 12 : quietHr}:00 ${quietHr >= 12 ? 'PM' : 'AM'}`;

            const AI_INSIGHTS = [
                {
                    title: insideCount > 0 ? `Occupancy at ${Math.floor((insideCount / capacity) * 100)}%` : "Facility Empty",
                    detail: insideCount > 0 ? `Current active count mapping nominal footprints. Busiest recorded hour tracks to ${bFmt}.` : "No presence detected floor-wide natively. Quiet operations secure.",
                    confidence: 100,
                    action: insideCount > (capacity * 0.8) ? "Hold Access" : "Monitor Dashboard"
                }
            ]

            return {
                totalMembers,
                totalTrainers,
                todayCheckins,
                revenueMtd: `${currencySymbol}${totalMembers > 0 ? (totalMembers * 49.99).toLocaleString() : '0.00'}`,
                zones: ZONES,
                dist: WORKOUT_DIST,
                dailyLine: ATTENDANCE_DAILY,
                insights: AI_INSIGHTS,
                subscription: subStatus
            }
        }
    }

    // Default Fallback Aggregate (Protects Vercel SSR when Firebase is unconfigured)
    return {
        totalMembers: 0,
        totalTrainers: 0,
        todayCheckins: 0,
        revenueMtd: '₹ 0.00',
        zones: [],
        dist: [],
        dailyLine: [],
        insights: []
    };
}

export async function regenerateGymCode(gymIdParam) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let sessionGymId = 'DEMO'
        try { if (sessionStr) sessionGymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        const gymId = gymIdParam || sessionGymId;

        if (adminDb && gymId && gymId !== 'DEMO') {
            const gymDoc = await adminDb.collection('gyms').doc(gymId).get()
            const existingData = gymDoc.data() || {}

            const gymName = existingData.name || 'GYM';
            const suffix = gymName.replace(/[^A-Za-z0-z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
            const newCode = `GYM-${suffix}-${Math.floor(1000 + Math.random() * 9000)}`;

            const existingCodeDoc = await adminDb.collection('gyms').where('gymCode', '==', newCode).get()
            if (!existingCodeDoc.empty) return regenerateGymCode(gymId)

            const now = new Date().toISOString()
            await adminDb.collection('gyms').doc(gymId).update({
                gymCode: newCode,
                qrCreatedDate: existingData.qrCreatedDate || now,
                qrLastResetDate: now
            })
            revalidatePath('/settings')
            return newCode;
        }
    }
    return null;
}
