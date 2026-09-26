const fs = require('fs');
const envText = fs.readFileSync('../.env.prod.local', 'utf8');

const getVal = (key) => {
    let match = envText.match(new RegExp(`^${key}=([^\\r\\n]+)`, 'm'));
    if (!match) return undefined;
    let val = match[1].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    return val;
};

const pk = (getVal('FIREBASE_PRIVATE_KEY') || '').replace(/\\\\n/g, '\\n').replace(/\\r/g, '');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

console.log("PROJECT:", getVal('FIREBASE_PROJECT_ID') || getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ? "FOUND" : "MISSING");
console.log("EMAIL:", getVal('FIREBASE_CLIENT_EMAIL') ? "FOUND" : "MISSING");
console.log("KEY LENGTH:", pk.length);

try {
    initializeApp({
        credential: cert({
            projectId: getVal('FIREBASE_PROJECT_ID') || getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
            clientEmail: getVal('FIREBASE_CLIENT_EMAIL'),
            privateKey: pk
        })
    });
} catch (e) {
    console.error("Initialization Failed:", e.stack);
    process.exit(1);
}

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

    const gymsSnap = await adminDb.collection('gyms').get();
    let validGymIds = new Set(gymsSnap.docs.map(d => d.id));
    let validGymCodes = new Set(gymsSnap.docs.map(d => d.data().gymCode).filter(Boolean));

    const memSnap = await adminDb.collection('members').get();
    for (const doc of memSnap.docs) {
        const u = doc.data();
        let orphan = false;
        if (u.authUid && !allAuthUids.has(u.authUid)) orphan = true;
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) orphan = true;

        if (orphan) {
            console.log(`Removing orphan member: ${u.email || doc.id}`);
            await doc.ref.delete();
            if (u.authUid) { try { await adminAuth.deleteUser(u.authUid); } catch (e) { } }
            countRemoved++;
        }
    }

    const trnSnap = await adminDb.collection('trainers').get();
    for (const doc of trnSnap.docs) {
        const u = doc.data();
        let orphan = false;
        if (u.uid && !allAuthUids.has(u.uid)) orphan = true;
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) orphan = true;

        if (orphan) {
            console.log(`Removing orphan trainer: ${u.email || doc.id}`);
            await doc.ref.delete();
            if (u.uid) { try { await adminAuth.deleteUser(u.uid); } catch (e) { } }
            countRemoved++;
        }
    }

    console.log(`Complete! Cleaned up ${countRemoved} orphaned ghost records.`);
}

run().catch(console.error);
