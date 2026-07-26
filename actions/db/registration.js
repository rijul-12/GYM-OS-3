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
    let user;
    try {
        user = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.ownerName,
            phoneNumber: data.phone.startsWith('+') ? data.phone : undefined // Firebase requires E.164
        });
    } catch (err) {
        return { error: err.message };
    }

    try {
        // 2. Set Custom Claim for RBAC
        await adminAuth.setCustomUserClaims(user.uid, { role: 'owner', gymCode: uniqueCode });

        // 3. Write native Firestore Gym Record
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

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
            status: 'Active',
            subscriptionStatus: 'Trial',
            isTrial: true,
            trialEndDate: trialEndDate.toISOString(),
            plan: 'starter-monthly', // Default access tier during trial
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

        // 5. Dispatch Welcome Email (Strictly bounded to prevent SMTP hangs)
        try {
            const { sendEmail } = await import('@/lib/email');
            const emailPromise = sendEmail({
                to: data.email,
                subject: 'GymOS - Registration Successful',
                headline: `Welcome to GymOS, ${data.ownerName}`,
                greeting: 'Your Gym Facility has been created!',
                bodyHtml: `<p>Thank you for partnering with GymOS to manage <strong>${data.gymName}</strong>.</p><p>Your unique Gym Code is: <strong style="color: #ef4444; font-size: 18px;">${uniqueCode}</strong></p><p>Share this code with your Trainers and Members so they can join your facility network.</p>`,
                button: { text: "Login to Owner Dashboard", url: "https://gymos.app/login" }
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email SMTP Timeout')), 4000));
            await Promise.race([emailPromise, timeoutPromise]);
        } catch (emailErr) {
            console.log("Non-critical Warning: Welcome email timed out, but allowing registration.", emailErr.message);
        }

        return { success: true, gymCode: uniqueCode, uid: user.uid };
    } catch (err) {
        return { error: "Failed to initialize gym backend. Please contact support." };
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
            return { error: "Invalid Gym Code. Verification failed." };
        }
    }

    // 2. Create Auth User
    let user;
    try {
        user = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.trainerName,
        });
    } catch (err) {
        return { error: err.message };
    }

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

        // 5. Dispatch Trainer Welcome Email
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
            to: data.email,
            subject: 'Welcome to GymOS for Trainers',
            headline: 'Your Trainer Profile is Ready',
            greeting: `Hello ${data.trainerName},`,
            bodyHtml: `<p>You have successfully registered as a Trainer for the gym under code: <strong>${gymCodeRaw}</strong>.</p><p>Your account is currently in <strong>Pending</strong> status until the Gym Owner approves your profile.</p>`,
            button: { text: "Login to Trainer Portal", url: "https://gymos.app/login" }
        });

        return { success: true, uid: user.uid };
    } catch (err) {
        return { error: "Critical failure writing generic profile object." };
    }
}


export async function processMemberRegistration(data) {
    const { adminDb, adminAuth } = await import('@/lib/firebase/server');

    // 1. Validate Gym Code strictly
    const gymCodeRaw = data.gymCode?.trim()?.toUpperCase();
    const gymSnap = await adminDb.collection('gyms').where('gymCode', '==', gymCodeRaw).get();

    if (gymSnap.empty) return { error: "Invalid Gym Code. Please check with your gym." };

    // 1b. Validate Member Limits!
    const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
    const { getMemberLimit } = await import('@/lib/permissions');

    const subStatus = await getSubscriptionStatus(gymCodeRaw);
    if (subStatus.currentPhase === 'Expired') {
        return { error: 'Facility subscription has expired. Registrations are paused.' };
    }

    const limit = getMemberLimit(subStatus.plan);
    const mSnap = await adminDb.collection('members')
        .where('gymId', '==', gymCodeRaw)
        .where('status', 'in', ['Active', 'Pending'])
        .count().get();

    if (mSnap.data().count >= limit) {
        return { error: 'You have reached your plan limit.' };
    }

    // 2. Create Auth User
    let user;
    try {
        user = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
    } catch (err) {
        return { error: err.message };
    }

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
        // 5. Dispatch Member Welcome Email
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
            to: data.email,
            subject: 'Welcome to GymOS Member Portal',
            headline: 'Your Registration is Complete',
            greeting: `Hello ${data.name},`,
            bodyHtml: `<p>You have successfully joined the GymOS network under your gym's tenant code: <strong>${gymCodeRaw}</strong>.</p><p>You can now log in to view your workout schedule, track progress, and manage your health goals.</p>`,
            button: { text: "Login to Member Portal", url: "https://gymos.app/login" }
        });

        return { success: true, uid: user.uid };
    } catch (err) {
        return { error: "Unable to map complex member intelligence matrix." };
    }
}
