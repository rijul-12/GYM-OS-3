'use server'

function generateGymCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const num = Math.floor(1000 + Math.random() * 9000);
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    return `GYM-${l1}${l2}${l3}-${num}`;
}

function isFirebaseConfigured() {
    return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
}

export async function processOwnerRegistration(data) {
    try {
        const { adminDb, adminAuth } = await import('@/lib/firebase/server');
        if (!adminDb || !adminAuth) throw new Error("CRITICAL: Firebase Admin failed to initialize. Check environment variables.");

        // Check if gym code exists recursively
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
                phoneNumber: data.phone.startsWith('+') ? data.phone : undefined
            });
        } catch (err) {
            return { error: err.message };
        }

        try {
            // 2. Set Custom Claim for RBAC
            await adminAuth.setCustomUserClaims(user.uid, { role: 'owner', gymCode: uniqueCode });

            const trialEndDate = new Date();
            trialEndDate.setMonth(trialEndDate.getMonth() + 2);

            await adminDb.collection('gyms').doc(uniqueCode).set({
                gymCode: uniqueCode,
                gymName: data.gymName,
                ownerName: data.ownerName,
                email: data.email,
                phone: data.phone,
                city: (data.city || '').trim().toLowerCase(),
                state: (data.state || '').trim(),
                country: (data.country || '').trim(),
                pinCode: (data.pinCode || '').trim(),
                gymType: data.gymType,
                capacity: data.membershipCapacity,
                createdAt: new Date().toISOString(),
                status: 'Active',
                subscriptionStatus: 'Trial',
                isTrial: true,
                trialEndDate: trialEndDate.toISOString(),
                plan: 'starter-monthly',
                ownerUid: user.uid
            });

            await adminDb.collection('gym_settings').doc(uniqueCode).set({
                timezone: data.timezone || 'Asia/Kolkata',
                currency: data.currency || '₹ INR',
                unit: 'lbs',
                primaryColor: '#ef4444',
                onboarded: false
            });

            try {
                const { sendEmail } = await import('@/lib/email');
                const { getLoginUrl } = await import('@/lib/url-builder');
                const emailPromise = sendEmail({
                    to: data.email,
                    subject: 'BGM - Registration Successful',
                    headline: `Welcome to BGM, ${data.ownerName}`,
                    greeting: 'Your Gym Facility has been created!',
                    bodyHtml: `<p>Thank you for partnering with BGM to manage <strong>${data.gymName}</strong>.</p><p>Your unique Gym Code is: <strong style="color: #ef4444; font-size: 18px;">${uniqueCode}</strong></p><p>Share this code with your Trainers and Members so they can join your facility network.</p>`,
                    button: { text: "Login to Owner Dashboard", url: getLoginUrl() }
                });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email SMTP Timeout')), 4000));
                await Promise.race([emailPromise, timeoutPromise]);
            } catch (emailErr) {
                console.log("Non-critical Warning: Welcome email timed out, but allowing registration.", emailErr.message);
            }

            return { success: true, gymCode: uniqueCode, uid: user.uid };
        } catch (err) {
            return { error: "Failed to initialize gym backend: " + err.message };
        }
    } catch (globalErr) {
        return { error: globalErr.message };
    }
}

export async function processTrainerRegistration(data) {
    try {
        const { adminDb, adminAuth } = await import('@/lib/firebase/server');
        if (!adminDb || !adminAuth) throw new Error("CRITICAL: Firebase Admin failed to initialize.");

        const gymCodeRaw = data.gymCode?.trim()?.toUpperCase();

        if (!isFirebaseConfigured() || gymCodeRaw === 'DEMO') {
            await new Promise(r => setTimeout(r, 600));
            return { success: true, uid: 'demo-trainer-' + Math.floor(Math.random() * 10000) };
        }
        let actualGymId = gymCodeRaw;

        let gymSnap = await adminDb.collection('gyms').doc(gymCodeRaw).get();
        if (gymSnap.exists) {
            actualGymId = gymSnap.id;
        } else {
            const qSnap = await adminDb.collection('gyms').where('gymCode', '==', gymCodeRaw).get();
            if (qSnap.empty) {
                return { error: "Invalid Gym Code. Verification failed." };
            }
            actualGymId = qSnap.docs[0].id;
        }

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
            await adminAuth.setCustomUserClaims(user.uid, { role: 'trainer', gymCode: actualGymId });

            await adminDb.collection('trainers').doc(user.uid).set({
                gymId: actualGymId,
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
                status: 'Pending'
            });

            const { sendEmail } = await import('@/lib/email');
            const { getLoginUrl } = await import('@/lib/url-builder');
            await sendEmail({
                to: data.email,
                subject: 'Welcome to BGM for Trainers',
                headline: 'Your Trainer Profile is Ready',
                greeting: `Hello ${data.trainerName},`,
                bodyHtml: `<p>You have successfully registered as a Trainer for the gym under code: <strong>${gymCodeRaw}</strong>.</p><p>Your account is currently in <strong>Pending</strong> status until the Gym Owner approves your profile.</p>`,
                button: { text: "Login to Trainer Portal", url: getLoginUrl() }
            });

            return { success: true, uid: user.uid };
        } catch (err) {
            return { error: "Critical failure writing generic profile object: " + err.message };
        }
    } catch (globalErr) {
        return { error: globalErr.message };
    }
}


export async function processMemberRegistration(data) {
    try {
        const { adminDb, adminAuth } = await import('@/lib/firebase/server');
        if (!adminDb || !adminAuth) throw new Error("CRITICAL: Firebase Admin failed to initialize.");

        const gymCodeRaw = data.gymCode?.trim()?.toUpperCase();

        if (!isFirebaseConfigured() || gymCodeRaw === 'DEMO') {
            await new Promise(r => setTimeout(r, 600));
            return { success: true, uid: 'demo-member-' + Math.floor(Math.random() * 10000) };
        }
        let actualGymId = gymCodeRaw;

        let gymDoc = await adminDb.collection('gyms').doc(gymCodeRaw).get();
        if (gymDoc.exists) {
            actualGymId = gymDoc.id;
        } else {
            const gymSnap = await adminDb.collection('gyms').where('gymCode', '==', gymCodeRaw).get();
            if (gymSnap.empty) return { error: "Invalid Gym Code. Please check with your gym." };
            actualGymId = gymSnap.docs[0].id;
        }

        const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
        const { getMemberLimit } = await import('@/lib/permissions');

        const subStatus = await getSubscriptionStatus(actualGymId);
        if (subStatus.currentPhase === 'Expired') {
            return { error: 'Facility subscription has expired. Registrations are paused.' };
        }

        const limit = getMemberLimit(subStatus.plan);
        const mSnap = await adminDb.collection('members')
            .where('gymId', '==', actualGymId)
            .where('status', 'in', ['Active', 'Pending'])
            .count().get();

        if (mSnap.data().count >= limit) {
            return { error: 'You have reached your plan limit.' };
        }

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
            await adminAuth.setCustomUserClaims(user.uid, { role: 'member', gymCode: actualGymId });

            await adminDb.collection('members').doc(user.uid).set({
                gymId: actualGymId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                age: data.age,
                gender: data.gender,
                height: data.height,
                weight: data.weight,
                medicalConditions: data.medicalConditions,
                emergencyContact: data.emergencyContact,

                fitnessGoal: data.fitnessGoal,
                primaryWorkoutSplit: data.primaryWorkoutSplit,
                preferredWorkoutTime: data.preferredWorkoutTime,
                preferredWorkoutDuration: data.preferredWorkoutDuration,
                trainingDays: data.trainingDays,
                weeklySchedule: data.weeklySchedule || { Monday: ['Chest'], Tuesday: ['Back'], Wednesday: ['Rest'], Thursday: ['Legs'], Friday: ['Shoulders', 'Arms'], Saturday: ['Cardio'], Sunday: ['Rest'] },

                plan: 'Basic',
                status: 'Active',
                joinedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });

            const { sendEmail } = await import('@/lib/email');
            const { getLoginUrl } = await import('@/lib/url-builder');
            await sendEmail({
                to: data.email,
                subject: 'Welcome to BGM Member Portal',
                headline: 'Your Registration is Complete',
                greeting: `Hello ${data.name},`,
                bodyHtml: `<p>You have successfully joined the BGM network under your gym's tenant code: <strong>${gymCodeRaw}</strong>.</p><p>You can now log in to view your workout schedule, track progress, and manage your health goals.</p>`,
                button: { text: "Login to Member Portal", url: getLoginUrl() }
            });

            return { success: true, uid: user.uid };
        } catch (err) {
            return { error: "Unable to map complex member intelligence matrix: " + err.message };
        }
    } catch (globalErr) {
        return { error: globalErr.message };
    }
}
