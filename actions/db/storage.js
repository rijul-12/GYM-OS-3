'use server'

import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function uploadProfilePhoto(uid, base64Data) {
    if (isFirebaseConfigured() && base64Data) {
        const { adminStorage, adminDb, adminAuth } = await import('@/lib/firebase/server');
        if (adminStorage && adminDb) {
            try {
                // Ensure base64 padding is stripped and buffered correctly
                const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Content, 'base64');
                const uniqueId = `profilePhotos/${uid}/avatar-${Date.now()}.webp`;

                const bucket = adminStorage.bucket();
                const file = bucket.file(uniqueId);

                await file.save(buffer, {
                    metadata: {
                        contentType: 'image/webp',
                        cacheControl: 'public, max-age=31536000'
                    }
                });

                // Generate exact standardized download url without provoking uniform ACL rules
                const encodedPath = encodeURIComponent(uniqueId);
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

                // Update cross-role database nodes dynamically explicitly avoiding orphaned data
                let updated = 0;

                // Users (Owners/SuperAdmins)
                const userQ = await adminDb.collection('users').where('uid', '==', uid).limit(1).get()
                if (!userQ.empty) { await userQ.docs[0].ref.update({ photoURL: publicUrl }); updated++; }
                else {
                    const fallbackUser = await adminDb.collection('users').doc(uid).get()
                    if (fallbackUser.exists) { await fallbackUser.ref.update({ photoURL: publicUrl }); updated++; }
                }

                // Members
                const memberQ = await adminDb.collection('members').where('authUid', '==', uid).limit(1).get()
                if (!memberQ.empty) { await memberQ.docs[0].ref.update({ photoURL: publicUrl, photo_url: publicUrl }); updated++; }
                else {
                    const fallbackMem = await adminDb.collection('members').doc(uid).get()
                    if (fallbackMem.exists) { await fallbackMem.ref.update({ photoURL: publicUrl, photo_url: publicUrl }); updated++; }
                }

                // Trainers
                const trainerQ = await adminDb.collection('trainers').where('uid', '==', uid).limit(1).get()
                if (!trainerQ.empty) { await trainerQ.docs[0].ref.update({ photoURL: publicUrl, photo: publicUrl }); updated++; }
                else {
                    const fallbackTrainer = await adminDb.collection('trainers').doc(uid).get()
                    if (fallbackTrainer.exists) { await fallbackTrainer.ref.update({ photoURL: publicUrl, photo: publicUrl }); updated++; }
                }

                // Ensure Firebase Auth synchronizes organically for cross-network integration
                if (adminAuth) {
                    try { await adminAuth.updateUser(uid, { photoURL: publicUrl }); } catch (e) { console.warn("Skip Auth Update:", e.message) }
                }

                revalidatePath('/portal/profile');
                revalidatePath('/trainer/profile');
                revalidatePath('/dashboard/settings');
                revalidatePath('/super-admin/profile');

                return { success: true, url: publicUrl, updatedNodes: updated };
            } catch (err) {
                console.error("Storage upload failed:", err);
                return { success: false, error: err.message };
            }
        }
    }
    return { success: false, error: "Firebase configuration missing or invalid payload." };
}

export async function removeProfilePhoto(uid) {
    if (isFirebaseConfigured()) {
        const { adminDb, adminAuth } = await import('@/lib/firebase/server');
        if (adminDb) {

            // Users
            const userQ = await adminDb.collection('users').where('uid', '==', uid).limit(1).get()
            if (!userQ.empty) await userQ.docs[0].ref.update({ photoURL: null })
            else {
                const fallbackUser = await adminDb.collection('users').doc(uid).get()
                if (fallbackUser.exists) await fallbackUser.ref.update({ photoURL: null })
            }

            // Members
            const memberQ = await adminDb.collection('members').where('authUid', '==', uid).limit(1).get()
            if (!memberQ.empty) await memberQ.docs[0].ref.update({ photoURL: null, photo_url: null })
            else {
                const fallbackMem = await adminDb.collection('members').doc(uid).get()
                if (fallbackMem.exists) await fallbackMem.ref.update({ photoURL: null, photo_url: null })
            }

            // Trainers
            const trainerQ = await adminDb.collection('trainers').where('uid', '==', uid).limit(1).get()
            if (!trainerQ.empty) await trainerQ.docs[0].ref.update({ photoURL: null, photo: null })
            else {
                const fallbackTrainer = await adminDb.collection('trainers').doc(uid).get()
                if (fallbackTrainer.exists) await fallbackTrainer.ref.update({ photoURL: null, photo: null })
            }

            // Clean Auth Network
            if (adminAuth) {
                try { await adminAuth.updateUser(uid, { photoURL: null }); } catch (e) { }
            }

            revalidatePath('/portal/profile');
            revalidatePath('/trainer/profile');
            revalidatePath('/dashboard/settings');
            revalidatePath('/super-admin/profile');
            return true;
        }
    }
    return false;
}
