const fs = require('fs');

const envFile = fs.readFileSync('../.env.prod.local', 'utf8');
const env = {};
envFile.split(/\\r?\\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim().replace(/^"|"$/g, '').trim();
        env[match[1].trim()] = val;
    }
});

const key = env.FIREBASE_PRIVATE_KEY || '';
// In NextJS Vercel files, literal \n is usually exactly that. We need to make sure we escape it in the JS code string!
const hardCodedKey = key.replace(/\\n/g, '\\\\n');

const js = `
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
    credential: cert({
        projectId: "${env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
        clientEmail: "${env.FIREBASE_CLIENT_EMAIL}",
        privateKey: "${hardCodedKey}".replace(/\\\\n/g, '\\n')
    })
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

    const gymsSnap = await adminDb.collection('gyms').get();
    let validGymIds = new Set(gymsSnap.docs.map(d => d.id));
    let validGymCodes = new Set(gymsSnap.docs.map(d => d.data().gymCode).filter(Boolean));

    const memSnap = await adminDb.collection('members').get();
    for(const doc of memSnap.docs) {
        const u = doc.data();
        let orphan = false;
        if (u.authUid && !allAuthUids.has(u.authUid)) orphan = true;
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) orphan = true;
        
        if (orphan) {
            console.log("Removing orphan member: " + (u.email || doc.id));
            await doc.ref.delete();
            if(u.authUid) { try { await adminAuth.deleteUser(u.authUid); } catch(e){} }
            countRemoved++;
        }
    }

    const trnSnap = await adminDb.collection('trainers').get();
    for(const doc of trnSnap.docs) {
        const u = doc.data();
        let orphan = false;
        if (u.uid && !allAuthUids.has(u.uid)) orphan = true;
        if (u.gymId && u.gymId !== 'DEMO' && !validGymIds.has(u.gymId) && !validGymCodes.has(u.gymId)) orphan = true;
        
        if (orphan) {
            console.log("Removing orphan trainer: " + (u.email || doc.id));
            await doc.ref.delete();
            if(u.uid) { try { await adminAuth.deleteUser(u.uid); } catch(e){} }
            countRemoved++;
        }
    }

    console.log("Complete! Cleaned up " + countRemoved + " orphaned ghost records.");
}

run().catch(console.error);
`;

fs.writeFileSync('wipe.js', js, 'utf8');
console.log('Script Generated Successfully');
