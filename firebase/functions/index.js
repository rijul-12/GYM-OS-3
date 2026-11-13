// Firebase Cloud Function (1st gen Auth trigger).
//
// When an account is deleted in Firebase Authentication — from the console,
// the Admin SDK or the app itself — this tells the BGM application to remove
// that user's footprint (profile, attendance, notifications, storage, and for
// an owner the whole gym). The application endpoint is idempotent.
//
// Deploy:
//   firebase functions:secrets:set BGM_WEBHOOK_SECRET     (same value as FIREBASE_WEBHOOK_SECRET in Vercel)
//   firebase deploy --only functions
const functions = require('firebase-functions/v1');

const APP_URL = process.env.BGM_APP_URL || 'https://gymos.app';

exports.onAuthUserDeleted = functions
  .region('asia-south1')
  .runWith({ secrets: ['BGM_WEBHOOK_SECRET'], timeoutSeconds: 120 })
  .auth.user()
  .onDelete(async (user) => {
    const res = await fetch(`${APP_URL}/api/webhooks/firebase-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.BGM_WEBHOOK_SECRET}` },
      body: JSON.stringify({ uid: user.uid }),
    });
    // 409 = protected account (Super Admin); nothing to retry.
    if (!res.ok && res.status !== 409) {
      throw new Error(`BGM cleanup failed for ${user.uid}: HTTP ${res.status}`);
    }
  });
