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
  title: 'GymOS — Premium Gym Management',
  description: 'The white-label operating system for the world\'s best gyms.',
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
                <Toaster theme="dark" position="bottom-right" />
              </AuthProvider>
            </BrandProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
