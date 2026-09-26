const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

require('dotenv').config({ path: '../.env.prod.local' });

initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''
});

const adminDb = getFirestore();
const adminAuth = getAuth();

async function run() {
    console.log("Scanning Firebase Auth...");
    let allAuthUids = new Set();
    let pageToken;
    do {
        const ures = await adminAuth.listUsers(1000, pageToken);
        ures.users.forEach(u => allAuthUids.add(u.uid));
        pageToken = ures.pageToken;
    } while (pageToken);

    let countRemoved = 0;

    const memSnap = await adminDb.collection('members').get();
    for (const doc of memSnap.docs) {
        const u = doc.data();
        if (u.authUid && !allAuthUids.has(u.authUid)) {
            console.log(`Removing orphaned member: ${u.email || doc.id}`);
            await doc.ref.delete();
            countRemoved++;
        }
    }

    const trnSnap = await adminDb.collection('trainers').get();
    for (const doc of trnSnap.docs) {
        const u = doc.data();
        if (u.uid && !allAuthUids.has(u.uid)) {
            console.log(`Removing orphaned trainer: ${u.email || doc.id}`);
            await doc.ref.delete();
            countRemoved++;
        }
    }

    const gymsSnap = await adminDb.collection('gyms').get();
    let validGymIds = new Set(gymsSnap.docs.map(d => d.id));
    let validGymCodes = new Set(gymsSnap.docs.map(d => d.data().gymCode).filter(Boolean));

    const totalMemSnap = await adminDb.collection('members').get();
    for (const doc of totalMemSnap.docs) {
        const u = doc.data();
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) {
            console.log(`Removing ghost member (No Gym): ${u.email || doc.id}`);
            await doc.ref.delete();
            if (u.authUid) { try { await adminAuth.deleteUser(u.authUid); } catch (e) { } }
            countRemoved++;
        }
    }

    const totalTrnSnap = await adminDb.collection('trainers').get();
    for (const doc of totalTrnSnap.docs) {
        const u = doc.data();
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) {
            console.log(`Removing ghost trainer (No Gym): ${u.email || doc.id}`);
            await doc.ref.delete();
            if (u.uid) { try { await adminAuth.deleteUser(u.uid); } catch (e) { } }
            countRemoved++;
        }
    }

    console.log(`Complete! Handled ${countRemoved} orphaned ghost records.`);
}

run().catch(console.error);
