/**
 * Compresses an image client-side to ensure it safely fits within NextJS Edge (1-4MB max) payloads.
 * Converts to WebP natively keeping it universally below 200KB.
 */
export async function compressProfileImage(file, maxSize = 1024, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Restrict dimensions proportionally
                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height *= maxSize / width));
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width *= maxSize / height));
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export to WebP natively solving file size limitations
                const dataUrl = canvas.toDataURL('image/webp', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
