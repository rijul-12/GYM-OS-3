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
            const [membersListDoc, plansListDoc] = await Promise.all([
                adminDb.collection('members').where('gymId', '==', gymId).get(),
                adminDb.collection('plans').where('gymId', '==', gymId).get()
            ]);
            const members = membersListDoc.docs.map(d => ({ id: d.id, ...d.data() }));

            const plansMap = {};
            plansListDoc.docs.forEach(doc => {
                const pd = doc.data();
                if (pd.name) plansMap[pd.name.toLowerCase()] = parseFloat(pd.price) || 0;
            });

            let totalRevenue = 0;
            members.forEach(m => {
                if (m.is_active !== false && m.status !== 'Inactive') {
                    const planName = m.plan ? m.plan.toLowerCase() : '';
                    totalRevenue += (plansMap[planName] || 0);
                }
            });

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            const getWorkoutForToday = (m) => {
                if (m.weeklySchedule && m.weeklySchedule[today]) return m.weeklySchedule[today];
                if (m.workout) return m.workout;
                if (m.primaryWorkoutSplit) return m.primaryWorkoutSplit;
                return 'Rest';
            }

            const widgets = settingsSnap.exists && settingsSnap.data().widgets ? settingsSnap.data().widgets : [
                { id: 'w1', name: 'Chest Zone', capacity: 10, muscleGroup: 'Chest', isActive: true, emoji: '💪', color: '#ef4444' },
                { id: 'w2', name: 'Back Zone', capacity: 10, muscleGroup: 'Back', isActive: true, emoji: '🏋️', color: '#f97316' },
                { id: 'w3', name: 'Leg Zone', capacity: 10, muscleGroup: 'Legs', isActive: true, emoji: '🦵', color: '#22c55e' },
                { id: 'w4', name: 'Shoulder Zone', capacity: 10, muscleGroup: 'Shoulders', isActive: true, emoji: '🎯', color: '#eab308' },
                { id: 'w5', name: 'Arms Zone', capacity: 10, muscleGroup: 'Arms', isActive: true, emoji: '💥', color: '#84cc16' },
                { id: 'w6', name: 'Core Zone', capacity: 10, muscleGroup: 'Core', isActive: true, emoji: '🏃', color: '#3b82f6' }
            ];

            const activeWidgets = widgets.filter(w => w.isActive !== false);
            activeWidgets.forEach(w => w._count = 0);

            let str = 0, cardioCount = 0, yogaCount = 0, coreCount = 0;

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

                if (wStr.includes('cardio') || wStr.includes('hiit') || wStr.includes('treadmill')) cardioCount++;
                if (wStr.includes('yoga') || wStr.includes('flex')) yogaCount++;
                if (wStr.includes('core') || wStr.includes('abs')) coreCount++;
                if (wStr.includes('chest') || wStr.includes('back') || wStr.includes('leg') || wStr.includes('shoulder') || wStr.includes('arm')) str++;
                if (wStr.includes('full body')) { str += 1; coreCount += 1; }

                activeWidgets.forEach(w => {
                    if (!w.muscleGroup) return;
                    const mg = w.muscleGroup.toLowerCase();
                    if (mg === 'multiple' || mg === 'multi' || mg === 'full body') {
                        if (wStr.includes('full body') || wStr.includes('crossfit')) w._count++;
                    } else if (mg === 'chest' && (wStr.includes('chest') || wStr.includes('push'))) w._count++;
                    else if (mg === 'back' && (wStr.includes('back') || wStr.includes('pull'))) w._count++;
                    else if (mg === 'legs' && wStr.includes('leg')) w._count++;
                    else if (mg === 'shoulders' && wStr.includes('shoulder')) w._count++;
                    else if (mg === 'arms' && (wStr.includes('arm') || wStr.includes('bicep') || wStr.includes('tricep'))) w._count++;
                    else if (mg === 'core' && (wStr.includes('core') || wStr.includes('abs'))) w._count++;
                    else if (mg === 'cardio' && (wStr.includes('cardio') || wStr.includes('hiit') || wStr.includes('treadmill') || wStr.includes('run'))) w._count++;
                    else if (mg === 'yoga' && (wStr.includes('yoga') || wStr.includes('stretch') || wStr.includes('flex'))) w._count++;
                    else if (mg === 'swimming' && (wStr.includes('swim') || wStr.includes('pool'))) w._count++;
                    else if (wStr.includes(mg)) w._count++;
                });
            });

            const getDem = (count, maxCap) => Math.min(100, Math.floor((count / Math.max(1, maxCap)) * 100));
            const getStatus = (count, maxCap) => count > (maxCap * 0.7) ? 'Busy' : (count > (maxCap * 0.3) ? 'Medium' : 'Empty');

            const ZONES = activeWidgets.map((w, idx) => {
                let badgeColor = w.color || '#3b82f6';
                let hex = badgeColor;
                if (!hex.startsWith('#')) hex = '#3b82f6';
                let r = 59, g = 130, b = 246;
                if (hex.length === 7) { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); }
                return {
                    id: w.id || `w${idx}`,
                    name: w.name,
                    members: w._count,
                    demand: getDem(w._count, w.capacity || 10),
                    emoji: w.emoji || '✓',
                    color: hex,
                    status: getStatus(w._count, w.capacity || 10),
                    bg: `rgba(${r},${g},${b},0.03)`,
                    border: `rgba(${r},${g},${b},0.1)`
                }
            });

            const WORKOUT_DIST = [
                { name: 'Strength Training', value: str || 0, color: '#ef4444' },
                { name: 'Cardio Core', value: (cardioCount + coreCount) || 0, color: '#3b82f6' },
                { name: 'Flexibility / Yoga', value: yogaCount || 0, color: '#10b981' }
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
                revenueMtd: `${currencySymbol}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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

export async function saveGymWidgets(gymIdParam, widgets) {
    if (!isFirebaseConfigured()) return false;
    const { adminDb } = await import('@/lib/firebase/server');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('gymos_session')?.value;
    let sessionGymId = null;
    try { if (sessionStr) sessionGymId = JSON.parse(sessionStr).gymCode; } catch (e) { }

    const gymId = gymIdParam || sessionGymId;
    if (!adminDb || !gymId) return false;

    try {
        await adminDb.collection('gym_settings').doc(gymId).set({ widgets }, { merge: true });
        revalidatePath('/settings');
        revalidatePath('/portal');
        revalidatePath('/portal/live');
        revalidatePath('/super-admin');
        return true;
    } catch (e) {
        return false;
    }
}
