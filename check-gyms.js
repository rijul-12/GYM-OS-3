const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const envPath = '.env.prod.local';
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const m = line.match(/^([^=]+)=(.*)$/);
        if (m) {
            let key = m[1].trim();
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) { val = val.substring(1, val.length - 1); }
            process.env[key] = val;
        }
    });
}

async function checkGyms() {
    try {
        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        }
        const db = getFirestore();
        const gymsSnap = await db.collection('gyms').get();
        console.log(`Found ${gymsSnap.size} gyms.`);
        gymsSnap.forEach(doc => {
            console.log(`Doc ID: ${doc.id} | gymCode: ${doc.data().gymCode} | gymName: ${doc.data().gymName}`);
        });

        // Let's also check members
        const memSnap = await db.collection('members').get();
        console.log(`\nFound ${memSnap.size} members.`);
        memSnap.forEach(doc => {
            console.log(`Doc ID: ${doc.id} | member Email: ${doc.data().email} | gymId: ${doc.data().gymId}`);
        });

    } catch (e) {
        console.error("Error connecting to Firebase:", e);
    }
}

checkGyms();
