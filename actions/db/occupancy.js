'use server'

import { getMembers } from './members'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function getOccupancyStats() {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const sessionStr = cookieStore.get('gymos_session')?.value
        let gymId = 'DEMO'
        try { if (sessionStr) gymId = JSON.parse(sessionStr).gymCode || 'DEMO' } catch (e) { }

        if (adminDb) {
            // Read active capacity from owner settings
            const settingsDoc = await adminDb.collection('gym_settings').doc(gymId).get();
            const totalCapacity = settingsDoc.exists ? (settingsDoc.data().buildingCapacity || 100) : 100;

            // Memory filter to prevent needing a Composite Index!
            const activeCheckins = attendanceSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(d => !d.checkOut && !d.check_out_time);

            const insideCount = activeCheckins.length;
            const members = await getMembers();

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            const getWorkoutForToday = (m) => {
                if (m.weeklySchedule && m.weeklySchedule[today]) return m.weeklySchedule[today];
                if (m.workout) return m.workout;
                if (m.primaryWorkoutSplit) return m.primaryWorkoutSplit;
                return 'Rest';
            }

            const activeMembers = activeCheckins.map(a => {
                const mId = a.memberId || a.member_id || (a.members && a.members.id);
                return members.find(m => m.id === mId || m.name === (a.members && a.members.name)) || { workout: 'Rest' };
            });

            // Tally physical zone requests
            let chest = 0, back = 0, legs = 0, shoulders = 0, arms = 0, core = 0, cardio = 0, yoga = 0;
            activeMembers.forEach(m => {
                const w = getWorkoutForToday(m).toLowerCase();
                if (w.includes('chest') || w.includes('push')) chest++;
                if (w.includes('back') || w.includes('pull')) back++;
                if (w.includes('leg')) legs++;
                if (w.includes('shoulder')) shoulders++;
                if (w.includes('arm') || w.includes('bicep') || w.includes('tricep')) arms++;
                if (w.includes('core') || w.includes('abs')) core++;
                if (w.includes('cardio') || w.includes('hiit')) cardio++;
                if (w.includes('yoga') || w.includes('flex')) yoga++;
                if (w.includes('full body')) { chest++; back++; legs++; shoulders++; core++; }
                if (w.includes('powerlifting')) { chest++; back++; legs++; }
            });

            const strength = chest + back + legs + shoulders + arms;
            const WORKOUT_DIST = [
                { name: 'Strength Training', value: strength || 0, color: '#ef4444' },
                { name: 'Cardio / Core', value: (cardio + core) || 0, color: '#3b82f6' },
                { name: 'Flexibility / Yoga', value: yoga || 0, color: '#10b981' }
            ].filter(d => d.value > 0);
            if (WORKOUT_DIST.length === 0) WORKOUT_DIST.push({ name: 'Idle', value: 1, color: '#64748b' });

            let wUp = 0, activeFlr = 0, coolDwn = 0, recov = 0;
            const now = Date.now();
            activeCheckins.forEach(c => {
                const t = new Date(c.checkIn || c.check_in_time).getTime();
                const mins = (now - t) / 60000;
                if (mins < 15) wUp++;
                else if (mins < 45) activeFlr++;
                else if (mins < 75) coolDwn++;
                else recov++;
            });

            const MEMBER_STATUS = [
                { label: 'Warming up', color: '#f59e0b', desc: 'First 15 mins of session', count: wUp },
                { label: 'Active on floor', color: '#ef4444', desc: 'Heart rate peak estimated', count: activeFlr },
                { label: 'Cooling down', color: '#3b82f6', desc: 'Trending towards exit', count: coolDwn },
                { label: 'Recovery/Stretch', color: '#10b981', desc: 'Extended duration > 75m', count: recov },
            ]

            // Process true historical peaks for AI Constraints
            const todayStr = new Date().toISOString().split('T')[0];
            const hourlyCounts = {};
            attendanceSnap.docs.forEach(d => {
                const t = new Date(d.data().checkIn || d.data().check_in_time);
                if (t.toISOString().startsWith(todayStr)) {
                    const h = t.getHours();
                    hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
                }
            });

            const TRAFFIC_FORECAST = Array.from({ length: 14 }).map((_, i) => {
                const hour = i + 6;
                const actual = hourlyCounts[hour] || 0;
                return {
                    time: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`,
                    predicted: Math.floor(totalCapacity * 0.2), // Flat baseline fallback waiting for heavy ML curve injection later
                    actual: (new Date().getHours() >= hour) ? actual : null
                }
            });

            const busiestHour = Object.keys(hourlyCounts).reduce((a, b) => hourlyCounts[a] > hourlyCounts[b] ? a : b, 17);
            const peakStr = `${busiestHour > 12 ? busiestHour - 12 : busiestHour}:00 ${busiestHour >= 12 ? 'PM' : 'AM'}`;

            const AI_INSIGHTS = [];
            if (insideCount > totalCapacity * 0.8) {
                AI_INSIGHTS.push({ id: '1', tone: 'warning', category: 'Crowd Flow', title: 'Critical Capacity Reached', detail: `Gym is at ${Math.floor((insideCount / totalCapacity) * 100)}% capacity. Consider halting guest passes temporarily.`, confidence: 100, action: 'View Floor Plan' });
            } else {
                AI_INSIGHTS.push({ id: '1', tone: 'positive', category: 'General', title: 'Normal Active Traffic', detail: `Occupancy is stable at ${Math.floor((insideCount / totalCapacity) * 100)}%. Smooth flow detected globally.`, confidence: 100, action: '' });
            }
            if (activeFlr > (insideCount * 0.6)) {
                AI_INSIGHTS.push({ id: '2', tone: 'warning', category: 'Operations', title: 'Peak Floor Utilization', detail: `Majority of active members are deep in training routines. Expect high demand on free-weights.`, confidence: 95, action: 'Monitor' });
            }
            AI_INSIGHTS.push({ id: '3', tone: 'info', category: 'Trends', title: `Busiest Period: ${peakStr}`, detail: `Peak attendance tracking heaviest at ${peakStr} today. Staffing optimized for structural limits.`, confidence: 100, action: '' });

            return {
                WORKOUT_DIST,
                MEMBER_STATUS,
                AI_INSIGHTS,
                TRAFFIC_FORECAST,
                MEMBERS: members,
                insideCount,
                totalCapacity
            }
        }
    }
    return { WORKOUT_DIST: [], MEMBER_STATUS: [], AI_INSIGHTS: [], TRAFFIC_FORECAST: [], MEMBERS: [], insideCount: 0, totalCapacity: 100 }
}
