export default function manifest() {
    return {
        name: 'GymOS Technologies',
        short_name: 'GymOS',
        description: 'The Operating System for Modern Gyms',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
