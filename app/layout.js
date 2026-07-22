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
  title: 'GymOS — The Operating System for Modern Gyms',
  description: 'An AI-native gym intelligence layer predicting machine bottlenecks and scaling modern physical fitness facilities.',
  generator: 'Next.js',
  applicationName: 'GymOS',
  keywords: ['Gym', 'Management', 'AI', 'Fitness', 'Software', 'GymOS', 'B2B', 'Access Control'],
  creator: 'GymOS Technologies',
  publisher: 'GymOS Technologies',
  openGraph: {
    title: 'GymOS — The Operating System for Modern Gyms',
    description: 'An AI-native gym intelligence layer predicting machine bottlenecks and scaling modern physical fitness facilities.',
    url: 'https://gymos.tech',
    siteName: 'GymOS',
    images: [
      {
        url: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
        width: 1200,
        height: 630,
        alt: 'GymOS Production Command Center'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GymOS — The Operating System for Modern Gyms',
    description: 'An AI-native gym intelligence layer predicting machine bottlenecks and scaling physical fitness facilities.',
    creator: '@GymOSTech',
    images: ['https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg'],
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Providers>
            <BrandProvider>
              <AuthProvider>
                {children}
                <GlobalSearch />
                <Toaster theme="system" position="bottom-right" />
              </AuthProvider>
            </BrandProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
