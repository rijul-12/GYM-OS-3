'use server'

import { revalidatePath } from 'next/cache'

function isFirebaseConfigured() {
    return !!process.env.FIREBASE_PROJECT_ID;
}

export async function uploadProfilePhoto(memberId, base64Data) {
    if (isFirebaseConfigured() && base64Data) {
        const { adminStorage, adminDb } = await import('@/lib/firebase/server');
        if (adminStorage && adminDb) {
            try {
                // Ensure base64 padding is stripped and buffered correctly
                const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Content, 'base64');
                const uniqueId = `avatars/${memberId}-${Date.now()}.png`;

                const bucket = adminStorage.bucket();
                const file = bucket.file(uniqueId);

                await file.save(buffer, {
                    metadata: {
                        contentType: 'image/png'
                    },
                    public: true,
                    validation: 'md5'
                });

                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueId}`;

                // Atomically update DB
                await adminDb.collection('members').doc(memberId).update({
                    photo_url: publicUrl
                });

                revalidatePath('/portal/profile');
                revalidatePath('/members');

                return publicUrl;
            } catch (err) {
                console.error("Storage upload failed:", err);
            }
        }
    }
    return null;
}

export async function removeProfilePhoto(memberId) {
    if (isFirebaseConfigured()) {
        const { adminDb } = await import('@/lib/firebase/server');
        if (adminDb) {
            await adminDb.collection('members').doc(memberId).update({
                photo_url: null
            });
            revalidatePath('/portal/profile');
            revalidatePath('/members');
            return true;
        }
    }
    return false;
}
