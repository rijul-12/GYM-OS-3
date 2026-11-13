/**
 * Client-side profile photo preparation.
 * Validates the file, centre-crops it to a square, scales it down and encodes
 * it as JPEG — JPEG export works in every browser (canvas WebP export is not
 * available on iOS Safari), and the result stays far below the upload limit.
 */
export const PROFILE_PHOTO_MAX_INPUT_BYTES = 15 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export function validateImageFile(file) {
    if (!file) return 'No file selected.'
    if (file.type && !file.type.startsWith('image/')) return 'Please choose an image file.'
    if (file.type && !ACCEPTED.includes(file.type) && !file.type.startsWith('image/')) return 'Only JPG, PNG or WebP images are supported.'
    if (file.size > PROFILE_PHOTO_MAX_INPUT_BYTES) return 'This image is too large. Please choose one under 15 MB.'
    return null
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be read as an image.')) }
        img.src = url
    })
}

export async function compressProfileImage(file, size = 512, quality = 0.85) {
    const problem = validateImageFile(file)
    if (problem) throw new Error(problem)

    const img = await loadImage(file)
    const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height)
    if (!side) throw new Error('This file could not be read as an image.')
    const sx = ((img.naturalWidth || img.width) - side) / 2
    const sy = ((img.naturalHeight || img.height) - side) / 2
    const target = Math.min(size, side)

    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // flatten transparency for JPEG
    ctx.fillRect(0, 0, target, target)
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)

    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length > 1_300_000) dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('Your browser could not process this image.')
    return dataUrl
}
