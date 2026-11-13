import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// -----------------------------------------------------------------------
// Firebase Client SDK — used in the browser for authentication only.
// All data access goes through authorised Server Actions.
// -----------------------------------------------------------------------

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length
    ? getApp()
    : (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? initializeApp(firebaseConfig) : null);

export const auth = app ? getAuth(app) : null;

const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
if (auth && emulatorHost && typeof window !== 'undefined' && !globalThis.__bgmAuthEmulator) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    globalThis.__bgmAuthEmulator = true;
}

export default app;
