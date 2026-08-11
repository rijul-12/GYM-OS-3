const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envPath = '../.env.prod.local';
const rawEnv = fs.readFileSync(envPath, 'utf8');

rawEnv.split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
        let key = m[1].trim();
        let val = m[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        val = val.replace(/\\n/g, '\n');
        process.env[key] = val;
    }
});

async function run() {
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY
            })
        });
    }

    const adminDb = getFirestore();
    const testCode = "GYM-GYM-1232";
    console.log("Querying for:", testCode);
    const snap = await adminDb.collection('gyms').where('gymCode', '==', testCode).get();

    console.log("Got size:", snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data()));
}
run().catch(console.error);
