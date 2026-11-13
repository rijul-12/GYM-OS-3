import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// -----------------------------------------------------------------------
// Firebase Admin SDK — server only (Server Actions, Route Handlers).
// The Admin SDK bypasses Firestore/Storage security rules, so every caller
// MUST authorise the request first via lib/server/session.js.
// -----------------------------------------------------------------------

const pid = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Local emulator support (never set in production).
const usingEmulator = !!(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);

const isKeyValid = (key) => !!key && key.length > 50 && !key.includes('[SENSITIVE]');

function normalisePrivateKey(raw) {
    let privateKey = raw.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
    return privateKey.replace(/\\n/g, '\n').replace(/\\r/g, '');
}

if (!getApps().length && pid) {
    try {
        if (usingEmulator) {
            initializeApp({ projectId: pid, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${pid}.appspot.com` });
        } else if (isKeyValid(process.env.FIREBASE_PRIVATE_KEY) && process.env.FIREBASE_CLIENT_EMAIL && !process.env.FIREBASE_CLIENT_EMAIL.includes('[SENSITIVE]')) {
            initializeApp({
                credential: cert({
                    projectId: pid,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
                }),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            });
        }
    } catch (error) {
        // Never log the key material itself.
        console.error('Firebase Admin initialisation failed:', error.message);
    }
}

const app = getApps().length ? getApps()[0] : null;

export const adminDb = app ? getFirestore(app) : null;
if (adminDb && !globalThis.__bgmFirestoreConfigured) {
    try {
        adminDb.settings({ preferRest: !usingEmulator, ignoreUndefinedProperties: true });
    } catch { /* settings() may only be called once per process */ }
    globalThis.__bgmFirestoreConfigured = true;
}
export const adminAuth = app ? getAuth(app) : null;
export const adminStorage = app ? getStorage(app) : null;

/** True only when the Admin SDK actually initialised. */
export const isFirebaseConfigured = () => !!adminDb && !!adminAuth;

/** Names of the server environment variables that are missing (for precise error reporting). */
export function missingFirebaseEnv() {
    if (usingEmulator) return [];
    const missing = [];
    if (!pid) missing.push('FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!isKeyValid(process.env.FIREBASE_PRIVATE_KEY)) missing.push('FIREBASE_PRIVATE_KEY');
    return missing;
}
