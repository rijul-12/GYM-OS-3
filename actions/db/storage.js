'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase/server'
import { getSession, getMemberForSession, getTrainerForSession, UNAUTHORIZED } from '@/lib/server/session'

// One profile-photo pipeline for all four roles.
//
//   Storage path : profilePhotos/{uid}/avatar-{timestamp}.{ext}   (uid from the verified session)
//   Canonical URL: photoURL on the user's profile document
//                  owner / super admin → users/{uid}
//                  trainer             → trainers/{id}
//                  member              → members/{id}
//   Mirrored to  : Firebase Auth photoURL
//
// The file is written with a Firebase download token so the URL works without
// making the bucket public.

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = {
    'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    'image/png': { ext: 'png', magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
    'image/webp': { ext: 'webp', magic: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
}

function storageMissing() {
    const missing = []
    if (!adminStorage) missing.push('Firebase Admin credentials')
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')
    return missing
}

function downloadUrl(bucketName, path, token) {
    const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    const base = emulator ? `http://${emulator}` : 'https://firebasestorage.googleapis.com'
    return `${base}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
}

/** Where this user's canonical profile document lives. */
async function profileTargets(session) {
    const refs = []
    if (session.role === 'member') {
        const m = await getMemberForSession()
        if (m) refs.push({ ref: m.ref, extra: { photo_url: null } })
    } else if (session.role === 'trainer') {
        const t = await getTrainerForSession()
        if (t) refs.push({ ref: t.ref })
    } else {
        refs.push({ ref: adminDb.collection('users').doc(session.uid), create: { uid: session.uid, role: session.role, email: session.email, gymCode: session.gymId || null } })
    }
    return refs
}

async function writePhotoUrl(session, url) {
    const targets = await profileTargets(session)
    if (targets.length === 0) throw new Error('Profile record not found')
    const batch = adminDb.batch()
    for (const t of targets) {
        batch.set(t.ref, { ...(t.create || {}), photoURL: url, ...(t.extra ? { photo_url: url } : {}), photoUpdatedAt: new Date().toISOString() }, { merge: true })
    }
    await batch.commit()

    // Open attendance rows carry a denormalised photo for the owner's live view.
    if (session.role === 'member') {
        const m = await getMemberForSession()
        if (m) {
            const open = await adminDb.collection('attendance').where('member_id', '==', m.id).where('check_out_time', '==', null).get()
            await Promise.all(open.docs.map(d => d.ref.update({ member_photo: url })))
        }
    }
    try { await adminAuth.updateUser(session.uid, { photoURL: url }) } catch (e) { console.warn('auth photoURL not updated:', e.code || e.message) }
}

async function removeOldFiles(bucket, uid, keepPath) {
    try {
        const [files] = await bucket.getFiles({ prefix: `profilePhotos/${uid}/` })
        await Promise.all(files.filter(f => f.name !== keepPath).map(f => f.delete().catch(() => { })))
    } catch { /* cleanup is best-effort */ }
}

function refreshPaths() {
    for (const p of ['/portal/profile', '/portal', '/trainer/profile', '/trainer', '/settings', '/dashboard', '/super-admin/settings']) revalidatePath(p)
}

/**
 * Upload (or replace) the signed-in user's profile photo.
 * @param {string} dataUrl  a data:image/(jpeg|png|webp);base64,… string produced by the client-side compressor
 */
export async function uploadProfilePhoto(first, second) {
    // Older callers passed (uid, dataUrl). A uid from the client is ignored: identity comes from the session.
    const dataUrl = typeof second === 'string' ? second : first
    const session = await getSession()
    if (!session) return { success: false, error: UNAUTHORIZED.error }
    const missing = storageMissing()
    if (missing.length) return { success: false, error: `Photo upload is not configured (missing ${missing.join(', ')}).` }

    const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/) : null
    if (!match) return { success: false, error: 'Please choose an image file.' }
    const type = TYPES[match[1]]
    if (!type) return { success: false, error: 'Only JPG, PNG or WebP images are supported.' }

    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length < 100) return { success: false, error: 'The image appears to be empty.' }
    if (buffer.length > MAX_BYTES) return { success: false, error: 'The image is too large. Please choose one under 2 MB.' }
    if (!type.magic(buffer)) return { success: false, error: 'The file is not a valid image.' }

    try {
        const bucket = adminStorage.bucket()
        const path = `profilePhotos/${session.uid}/avatar-${Date.now()}.${type.ext}`
        const token = crypto.randomUUID()
        await bucket.file(path).save(buffer, {
            resumable: false,
            metadata: { contentType: match[1], cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token, ownerUid: session.uid } },
        })
        const url = downloadUrl(bucket.name, path, token)
        try {
            await writePhotoUrl(session, url)
        } catch (e) {
            await bucket.file(path).delete().catch(() => { }) // do not leave an orphaned upload behind
            throw e
        }
        await removeOldFiles(bucket, session.uid, path)
        refreshPaths()
        return { success: true, url }
    } catch (err) {
        console.error('profile photo upload failed:', err.message)
        return { success: false, error: 'The photo could not be saved. Please try again.' }
    }
}

/** Remove the signed-in user's profile photo. */
export async function removeProfilePhoto() {
    const session = await getSession()
    if (!session) return { success: false, error: UNAUTHORIZED.error }
    if (!adminDb) return { success: false, error: 'Not configured.' }
    try {
        await writePhotoUrl(session, null)
        if (adminStorage && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) await removeOldFiles(adminStorage.bucket(), session.uid, null)
        refreshPaths()
        return { success: true }
    } catch (e) {
        return { success: false, error: 'The photo could not be removed.' }
    }
}
