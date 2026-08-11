export function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'U';
}

export function getAvatarColor(name) {
    if (!name) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 16777215)) % 16777215).toString(16);
    return '#' + '000000'.substring(0, 6 - color.length) + color;
}
