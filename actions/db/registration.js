'use server'

function generateGymCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const num = Math.floor(1000 + Math.random() * 9000);
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    return `GYM-${l1}${l2}${l3}-${num}`;
}

export async function processOwnerRegistration(data) {
    const { adminDb, adminAuth } = await import('@/lib/firebase/server');

    // Check if gym code exists recursively (highly unlikely but standard)
    let uniqueCode = generateGymCode();
    let isUnique = false;
    while (!isUnique) {
        const snap = await adminDb.collection('gyms').where('gymCode', '==', uniqueCode).get();
        if (snap.empty) {
            isUnique = true;
        } else {
            uniqueCode = generateGymCode();
        }
    }

    // 1. Create Firebase Auth User
    const user = await adminAuth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.ownerName,
        phoneNumber: data.phone.startsWith('+') ? data.phone : undefined // Firebase requires E.164
    }).catch(err => {
        throw new Error(err.message);
    });

    try {
        // 2. Set Custom Claim for RBAC
        await adminAuth.setCustomUserClaims(user.uid, { role: 'owner', gymCode: uniqueCode });

        // 3. Write native Firestore Gym Record
        await adminDb.collection('gyms').doc(uniqueCode).set({
            gymCode: uniqueCode,
            gymName: data.gymName,
            ownerName: data.ownerName,
            email: data.email,
            phone: data.phone,
            city: data.city,
            state: data.state,
            country: data.country,
            gymType: data.gymType,
            capacity: data.membershipCapacity,
            createdAt: new Date().toISOString(),
            status: 'Pending', // Enforced manual SA Approval (Sprint Mandate Step 7)
            ownerUid: user.uid
        });

        // 4. Create initial settings
        await adminDb.collection('gym_settings').doc(uniqueCode).set({
            timezone: data.timezone || 'Asia/Kolkata',
            currency: data.currency || '₹ INR',
            unit: 'lbs',
            primaryColor: '#ef4444',
            onboarded: false
        });

        return { success: true, gymCode: uniqueCode, uid: user.uid };
    } catch (err) {
        throw new Error("Failed to initialize gym backend. Please contact support.");
    }
}

export async function processTrainerRegistration(data) {
    const { adminDb, adminAuth } = await import('@/lib/firebase/server');

    // 1. Validate Gym Code strictly
    const gymCodeRaw = data.gymCode?.trim()?.toUpperCase();
    const gymSnap = await adminDb.collection('gyms').doc(gymCodeRaw).get();

    if (!gymSnap.exists) {
        // Fallback to checking via field if somehow they aren't matching ID
        const qSnap = await adminDb.collection('gyms').where('gymCode', '==', gymCodeRaw).get();
        if (qSnap.empty) {
            throw new Error("Invalid Gym Code. Verification failed.");
        }
    }

    // 2. Create Auth User
    const user = await adminAuth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.trainerName,
    }).catch(err => {
        throw new Error(err.message);
    });

    try {
        // 3. Bind Role & Multitenant Token
        await adminAuth.setCustomUserClaims(user.uid, { role: 'trainer', gymCode: gymCodeRaw });

        // 4. Write Trainer Profile Object
        await adminDb.collection('trainers').doc(user.uid).set({
            gymId: gymCodeRaw,
            name: data.trainerName,
            email: data.email,
            phone: data.phone,
            specialization: data.specialization,
            experience: data.experience,
            workingDays: data.workingDays,
            preferredTiming: data.preferredTiming,
            photoURL: data.profilePhoto || null,
            rating: 5.0,
            activeClients: 0,
            createdAt: new Date().toISOString(),
            status: 'Pending' // Requires Owner Approval
        });

        return { success: true, uid: user.uid };
    } catch (err) {
        throw new Error("Critical failure writing generic profile object.");
    }
}


export async function processMemberRegistration(data) {
    const { adminDb, adminAuth } = await import('@/lib/firebase/server');

    // 1. Validate Gym Code strictly
    const gymCodeRaw = data.gymCode?.trim()?.toUpperCase();
    const gymSnap = await adminDb.collection('gyms').where('gymCode', '==', gymCodeRaw).get();

    if (gymSnap.empty) throw new Error("Invalid Gym Code. Please check with your gym.");

    // 2. Create Auth User
    const user = await adminAuth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.name,
    }).catch(err => {
        throw new Error(err.message);
    });

    try {
        // 3. Bind Member Role 
        await adminAuth.setCustomUserClaims(user.uid, { role: 'member', gymCode: gymCodeRaw });

        // 4. Construct Live Intelligence Matrix Schema Node
        await adminDb.collection('members').doc(user.uid).set({
            gymId: gymCodeRaw,
            name: data.name,
            email: data.email,
            phone: data.phone,
            age: data.age,
            gender: data.gender,
            height: data.height,
            weight: data.weight,
            medicalConditions: data.medicalConditions,
            emergencyContact: data.emergencyContact,

            // AI Goals & Preferences
            fitnessGoal: data.fitnessGoal,
            primaryWorkoutSplit: data.primaryWorkoutSplit,
            preferredWorkoutTime: data.preferredWorkoutTime,
            preferredWorkoutDuration: data.preferredWorkoutDuration,
            trainingDays: data.trainingDays,
            weeklySchedule: data.weeklySchedule || { Monday: 'Chest', Tuesday: 'Back', Wednesday: 'Rest', Thursday: 'Legs', Friday: 'Shoulders & Arms', Saturday: 'Cardio', Sunday: 'Rest' },

            plan: 'Basic', // default fallback
            status: 'Active',
            joinedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        return { success: true, uid: user.uid };
    } catch (err) {
        throw new Error("Unable to map complex member intelligence matrix.");
    }
}
