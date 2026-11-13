'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X, AlertTriangle, Clock } from 'lucide-react'
import { useBrand } from './brand-provider'
import { useAuth } from '@/lib/auth'
import { UserAvatar } from './user-avatar'
import { NotificationDropdown } from './notifications-dropdown'
import { FeedbackButton } from './feedback'

const ROLE_LABEL = { owner: 'Owner', trainer: 'Trainer', member: 'Member', super_admin: 'Super Admin' }

/**
 * Shared layout for all four portals: desktop sidebar, mobile drawer, sticky
 * header and (optionally) a bottom tab bar. Sign-out is reachable on every
 * screen size and always runs the real sign-out (Firebase + server session).
 */
export function AppShell({ children, title, subtitle, actions, nav, tabs = null, home, profileHref = null, showBanners = false, platformBrand = false }) {
  const pathname = usePathname()
  const { brand } = useBrand()
  const { signOut, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const doLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try { await signOut() } finally {
      // Hard navigation drops every cached server component of the previous user.
      window.location.assign('/login')
    }
  }

  const isActive = (href) => pathname === href || (href !== home && pathname.startsWith(href + '/'))
  const displayName = platformBrand ? 'BGM' : brand.gymName
  const logoText = platformBrand ? 'BGM' : (brand.logoText || String(brand.gymName || 'G').slice(0, 2).toUpperCase())

  const BrandMark = () => (
    <Link href={home} className="flex items-center gap-2.5 min-w-0">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold font-display text-white shrink-0" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>{logoText}</div>
      <div className="min-w-0">
        <div className="font-display font-bold tracking-tight truncate">{displayName}</div>
        <div className="text-[10px] text-foreground/40 uppercase tracking-widest">{ROLE_LABEL[user?.role] || ''}</div>
      </div>
    </Link>
  )

  const NavList = () => (
    <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-0.5" aria-label="Main">
      {nav.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-foreground/[0.07] text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]'}`}>
            <Icon className="h-4 w-4 shrink-0" style={active ? { color: brand.primaryColor } : undefined} />
            <span className="font-medium truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const AccountFooter = () => (
    <div className="shrink-0 border-t border-foreground/5 p-3 space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 px-2 py-2">
        <UserAvatar src={user?.photoURL} name={user?.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{user?.name || '—'}</div>
          <div className="text-[11px] text-foreground/40 truncate">{user?.email}</div>
        </div>
      </div>
      <FeedbackButton />
      <button type="button" onClick={doLogout} disabled={signingOut} data-testid="sign-out"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/[0.05] disabled:opacity-50 transition-colors">
        <LogOut className="h-4 w-4" /> {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-foreground/10 sticky top-0 h-[100dvh]">
        <div className="px-5 py-5 border-b border-foreground/5 shrink-0"><BrandMark /></div>
        <NavList />
        <AccountFooter />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(84vw,300px)] bg-background border-r border-foreground/10 flex flex-col pt-[env(safe-area-inset-top)] animate-in slide-in-from-left duration-200">
            <div className="px-4 py-4 border-b border-foreground/5 flex items-center justify-between gap-2 shrink-0">
              <BrandMark />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="p-2.5 -mr-1 rounded-lg text-foreground/70 hover:bg-foreground/[0.06]"><X className="h-5 w-5" /></button>
            </div>
            <NavList />
            <AccountFooter />
          </aside>
        </div>
      )}

      <main className={`flex-1 min-w-0 ${tabs ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-foreground/10 pt-[env(safe-area-inset-top)]">
          <div className="px-3 sm:px-8 py-3 flex items-center gap-2 sm:gap-4">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="lg:hidden p-2.5 -ml-1 rounded-lg text-foreground/70 hover:bg-foreground/[0.06] shrink-0"><Menu className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-foreground/50 truncate">{subtitle}</p>}
            </div>
            {actions && <div className="hidden sm:flex items-center gap-2 shrink-0">{actions}</div>}
            <NotificationDropdown />
            {profileHref
              ? <Link href={profileHref} aria-label="Profile" className="shrink-0"><UserAvatar src={user?.photoURL} name={user?.name} size={36} /></Link>
              : <UserAvatar src={user?.photoURL} name={user?.name} size={36} />}
          </div>
          {actions && <div className="sm:hidden px-3 pb-3 flex flex-wrap gap-2">{actions}</div>}
        </header>

        {showBanners && user?.readOnly && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 sm:px-8 py-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-sm">
            <div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /><span className="font-medium">Your BGM subscription has ended. The account is read-only.</span></div>
            {user.role === 'owner' && <Link href="/dashboard/subscription" className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md font-medium text-center shrink-0">Renew now</Link>}
          </div>
        )}
        {showBanners && !user?.readOnly && user?.subscriptionPhase === 'Trial' && user?.role === 'owner' && user.daysRemaining !== null && user.daysRemaining <= 14 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-sm">
            <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-amber-500 shrink-0" /><span>Free trial: <strong>{user.daysRemaining} day{user.daysRemaining === 1 ? '' : 's'}</strong> remaining.</span></div>
            <Link href="/dashboard/subscription" className="text-amber-400 font-medium hover:underline shrink-0">View plans</Link>
          </div>
        )}

        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">{children}</div>
      </main>

      {tabs && (
        <nav aria-label="Primary" className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-foreground/10 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((t) => {
              const Icon = t.icon
              const active = isActive(t.href)
              return (
                <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] active:bg-foreground/[0.05]">
                  <Icon className="h-5 w-5" style={{ color: active ? brand.primaryColor : undefined }} />
                  <span className={`text-[10px] font-medium ${active ? '' : 'text-foreground/50'}`} style={active ? { color: brand.primaryColor } : undefined}>{t.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
