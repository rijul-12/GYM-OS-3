export default function manifest() {
    return {
        name: 'BGM',
        short_name: 'BGM',
        description: 'An intelligent gym management platform.',
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
