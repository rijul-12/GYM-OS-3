const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

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
const auth = getAuth();

async function resetSuperAdmin() {
    const email = 'superadmin@gymos.com';
    const password = 'admin123';

    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        console.log('User exists. Updating password...');
        await auth.updateUser(userRecord.uid, { password });
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('Creating new Super Admin user...');
            userRecord = await auth.createUser({
                email,
                password,
                displayName: 'GymOS Platform Admin',
            });
        } else {
            console.error('Error fetching user:', error);
            process.exit(1);
        }
    }

    await auth.setCustomUserClaims(userRecord.uid, { role: 'super_admin' });
    console.log('Super Admin successfully provisioned!');
    console.log('Email:', email);
    console.log('Password:', password);
}

resetSuperAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
