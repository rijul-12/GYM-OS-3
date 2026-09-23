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

if (!getApps().length && pid && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
        initializeApp({
            credential: cert({
                projectId: pid,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/"/g, '').replace(/\\n/g, '\n').replace(/\\r/g, ''),
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
