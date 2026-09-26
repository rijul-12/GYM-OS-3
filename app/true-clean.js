const fs = require('fs');
const envLocal = fs.readFileSync('../.env.local.bak', 'utf8');
const envProd = fs.readFileSync('../.env.prod.local', 'utf8');

const getVal = (contents, key) => {
    const lines = contents.split(/[\\r\\n]+/);
    const line = lines.find(l => l.startsWith(key + '='));
    if (!line) return undefined;
    let val = line.substring(key.length + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    return val;
};

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

try {
    const rawKey = getVal(envLocal, 'FIREBASE_PRIVATE_KEY') || '';
    const privateKey = rawKey.replace(/\\\\n/g, '\\n');

    initializeApp({
        credential: cert({
            projectId: getVal(envProd, 'FIREBASE_PROJECT_ID') || getVal(envProd, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
            clientEmail: getVal(envProd, 'FIREBASE_CLIENT_EMAIL'),
            privateKey: privateKey,
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
