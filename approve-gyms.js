const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Extract env from .env.local manually
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const envLines = envFile.split('\n');
const env = {};
envLines.forEach(line => {
    if (!line.trim() || line.startsWith('#')) return;
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/(^"|"$)/g, '').replace(/\\n/g, '\n');
});

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY
        })
    });
}
const db = getFirestore();

async function approveAllPendingGyms() {
    console.log('Approving pending gyms...');
    const gyms = await db.collection('gyms').where('status', '==', 'Pending').get();
    if (gyms.empty) {
        console.log('No pending gyms found.');
        return;
    }

    for (const doc of gyms.docs) {
        await db.collection('gyms').doc(doc.id).update({ status: 'Active' });
        console.log(`Approved gym: ${doc.id}`);
    }
    console.log('All pending gyms are now Active!');
}

approveAllPendingGyms().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
