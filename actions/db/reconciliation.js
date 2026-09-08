'use server'
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function adminScanOrphans() {
    let orphans = { owners: [], members: [], trainers: [] };

    // Quick helper: if user uid is not in auth, they are orphans. 
    // WARNING: For large scale, fetching all Firebase Auth users takes time/pagination securely.
    // Given BGM scope, this simplifies the initial scan for development boundaries.

    let allAuthUids = new Set();
    let pageToken;
    do {
        const authUsers = await adminAuth.listUsers(1000, pageToken);
        authUsers.users.forEach(u => allAuthUids.add(u.uid));
        pageToken = authUsers.pageToken;
    } while (pageToken);

    const usersSnap = await adminDb.collection('users').get();
    usersSnap.docs.forEach(doc => {
        const u = doc.data();
        if (u.uid && !allAuthUids.has(u.uid)) {
            orphans.owners.push({ uid: u.uid, email: u.email || doc.id });
        }
    });

    const membersSnap = await adminDb.collection('members').get();
    membersSnap.docs.forEach(doc => {
        const u = doc.data();
        if (u.authUid && !allAuthUids.has(u.authUid)) {
            orphans.members.push({ uid: u.authUid, email: u.email });
        }
    });

    const trainersSnap = await adminDb.collection('trainers').get();
    trainersSnap.docs.forEach(doc => {
        const u = doc.data();
        if (u.uid && !allAuthUids.has(u.uid)) {
            orphans.trainers.push({ uid: u.uid, email: u.email });
        }
    });

    return orphans;
}
