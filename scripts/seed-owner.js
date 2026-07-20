require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

async function seed() {
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        }

        await admin.auth().deleteUser('fallback-test').catch(() => { });
        const user = await admin.auth().createUser({
            email: 'owner@gymos.com',
            password: '123456',
        });

        console.log(`Success! User created: ${user.email}`);
        process.exit(0);
    } catch (e) {
        if (e.code === 'auth/email-already-exists') {
            const user = await admin.auth().getUserByEmail('owner@gymos.com');
            await admin.auth().updateUser(user.uid, { password: '123456' });
            console.log('Success! User password reset to exactly: 123456');
            process.exit(0);
        } else {
            console.error('Failure:', e.message);
            process.exit(1);
        }
    }
}

seed();
