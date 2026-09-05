require('dotenv').config({ path: '.env.production' });
const { adminDb } = require('./lib/firebase/server');

async function testSync() {
    try {
        console.log("Fetching first active Gym...");
        const gyms = await adminDb.collection('gyms').limit(1).get();
        if (gyms.empty) return console.log("No Gyms Found");
        const gymId = gyms.docs[0].id;
        console.log("Using Gym ID:", gymId);

        console.log("Fetching first Member in this Gym...");
        const members = await adminDb.collection('members').where('gymId', '==', gymId).limit(1).get();
        if (members.empty) return console.log("No Members Found");
        const member = members.docs[0];
        console.log("Using Member:", member.id, "Name:", member.data().name);

        console.log("Simulating QR Check-in via Database Add (like markQrAttendance)...");
        const checkinData = {
            member_id: member.id,
            member_name: member.data().name || 'Member',
            member_photo: member.data().photo_url || null,
            gymId: gymId,
            check_in_time: new Date().toISOString(),
            check_out_time: null,
            method: 'QR',
            status: 'Active',
            actual_workout: ['Chest', 'Shoulders'],
            planned_workout: ['Chest', 'Shoulders']
        };
        const checkinRef = await adminDb.collection('attendance').add(checkinData);
        console.log("Created Checkin Document:", checkinRef.id);

        console.log("Running getOccupancyStats computation manually...");
        const attendanceSnap = await adminDb.collection('attendance').where('gymId', '==', gymId).get();
        const activeCheckins = attendanceSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(d => !d.checkOut && !d.check_out_time);

        console.log("Active Checkins Length:", activeCheckins.length);

        // Emulate Heatmap Calculation
        let chest = 0, back = 0, legs = 0, shoulders = 0, arms = 0, core = 0, cardio = 0, yoga = 0;
        activeCheckins.forEach(a => {
            let workoutArray = [];
            if (a.actual_workout && Array.isArray(a.actual_workout) && a.actual_workout.length > 0) {
                workoutArray = a.actual_workout;
            } else if (a.actual_workout && typeof a.actual_workout === 'string') {
                workoutArray = [a.actual_workout];
            } else {
                workoutArray = ['Rest']; // Mock fallback
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
        });

        console.log({ chest, back, legs, shoulders, arms, core, cardio, yoga });

        console.log("Cleaning up simulated checkin...");
        await checkinRef.delete();
        console.log("Deleted Checkin Document");

    } catch (e) {
        console.error(e);
    }
}
testSync();
