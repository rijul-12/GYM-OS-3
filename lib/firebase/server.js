import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// -----------------------------------------------------------------------
// Firebase Admin SDK (Server Actions & Edge ONLY)
// Safely bypasses RLS utilizing Service Worker limits.
// -----------------------------------------------------------------------

export const isFirebaseConfigured = () => !!process.env.FIREBASE_PROJECT_ID;

const pid = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const isKeyValid = (key) => key && key.length > 50 && !key.includes('[SENSITIVE]');

if (!getApps().length && pid && isKeyValid(process.env.FIREBASE_PRIVATE_KEY) && process.env.FIREBASE_CLIENT_EMAIL && !process.env.FIREBASE_CLIENT_EMAIL.includes('[SENSITIVE]')) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/\\r/g, '');

        initializeApp({
            credential: cert({
                projectId: pid,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        });
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error.stack);
    }
}

export const adminDb = getApps().length ? getFirestore(getApps()[0]) : null;
if (adminDb && typeof adminDb.settings === 'function') {
    adminDb.settings({ preferRest: true });
}
export const adminAuth = getApps().length ? getAuth() : null;
export const adminStorage = getApps().length ? getStorage() : null;
