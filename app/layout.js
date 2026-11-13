import './globals.css'
import { Providers } from './providers'
import { BrandProvider } from '@/components/brand-provider'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { GlobalSearch } from '@/components/global-search'

// Force all routes to render at request time (SSR), not at build time (SSG).
// Every page depends on client-side context providers (Auth, Brand) that
// aren't available during static prerendering.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'BGM — Best Gym Manager | Your Gym Runs. BGM Handles the Rest.',
  description: 'BGM is an intelligent gym management platform for memberships, attendance, trainers, payments, schedules and everyday gym operations.',
  generator: 'Next.js',
  applicationName: 'BGM',
  keywords: ['BGM', 'Best Gym Manager', 'Gym Management', 'Attendance', 'Fitness', 'Software', 'B2B', 'Payments'],
  creator: 'BGM Technologies',
  publisher: 'BGM Technologies',
  metadataBase: new URL('https://gymos.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'BGM — Best Gym Manager | Your Gym Runs. BGM Handles the Rest.',
    description: 'BGM is an intelligent gym management platform for memberships, attendance, trainers, payments, schedules and everyday gym operations.',
    url: 'https://gymos.app',
    siteName: 'BGM',
    images: [
      {
        url: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
        width: 1200,
        height: 630,
        alt: 'BGM gym management dashboard'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BGM — Best Gym Manager | Your Gym Runs. BGM Handles the Rest.',
    description: 'BGM is an intelligent gym management platform for memberships, attendance, trainers, payments, schedules and everyday gym operations.',
    creator: '@BGMTech',
    images: ['https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg'],
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Providers>
            <AuthProvider>
              <BrandProvider>
                {children}
                <GlobalSearch />
                <Toaster theme="system" position="bottom-right" />
              </BrandProvider>
            </AuthProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
