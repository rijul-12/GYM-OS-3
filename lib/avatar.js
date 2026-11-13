export function getInitials(name) {
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'U';
}

const PALETTE = ['#ef4444', '#f97316', '#d97706', '#16a34a', '#0d9488', '#0284c7', '#4f46e5', '#9333ea', '#db2777', '#475569'];

/** Stable, readable background colour derived from the name. */
export function getAvatarColor(name) {
    const s = String(name || 'User');
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(hash) % PALETTE.length];
}
