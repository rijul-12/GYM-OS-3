'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Radio, Sparkles, Calendar, User, CreditCard, Bell, Settings, LogOut, Activity } from 'lucide-react'
import { useBrand } from './brand-provider'
import { useAuth } from '@/lib/auth'

const ME = { name: 'Member', plan: 'Premium', photo: "https://i.pravatar.cc/150?u=m" }
const TABS = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/live', label: 'Live', icon: Radio },
  { href: '/portal/insights', label: 'AI', icon: Sparkles },
  { href: '/portal/attendance', label: 'Log', icon: Calendar },
  { href: '/portal/schedule', label: 'Sched', icon: Activity },
  { href: '/portal/profile', label: 'Me', icon: User },
]

const SIDE_LINKS = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/live', label: 'Live Gym', icon: Radio },
  { href: '/portal/insights', label: 'AI Insights', icon: Sparkles },
  { href: '/portal/attendance', label: 'Attendance', icon: Calendar },
  { href: '/portal/membership', label: 'Membership', icon: CreditCard },
  { href: '/portal/schedule', label: 'Schedule', icon: Activity },
  { href: '/portal/profile', label: 'Profile', icon: User },
]

export function PortalShell({ children, title, hideTitleOnDesktop = false }) {
  const pathname = usePathname()
  const { brand } = useBrand()
  const { signOut } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const doLogout = () => { signOut(); if (typeof window !== 'undefined') window.location.href = '/' }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-foreground/5 bg-black/50 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-5 py-6 border-b border-foreground/5">
          <Link href="/portal" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold font-display text-foreground" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>{brand.logoText || brand.gymName?.[0] || 'G'}</div>
            <div>
              <div className="font-display font-bold tracking-tight">{brand.gymName}</div>
              <div className="text-[10px] text-foreground/40 uppercase tracking-widest">Member</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {SIDE_LINKS.map((l) => {
            const Icon = l.icon
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]'}`}>
                <Icon className="h-4 w-4" style={active ? { color: brand.primaryColor } : {}} />
                <span className="font-medium">{l.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: brand.primaryColor }} />}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-foreground/5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-foreground/[0.03]">
            <Image src={ME.photo} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" alt="" width={120} height={120} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{ME.name.split(' ')[0]}</div>
              <div className="text-[10px] text-foreground/40">{ME.plan} member</div>
            </div>
            <Link href="/" onClick={(e) => { e.preventDefault(); doLogout() }} className="text-foreground/40 hover:text-foreground"><LogOut className="h-4 w-4" /></Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/5">
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold font-display text-foreground" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>{brand.logoText || brand.gymName?.[0] || 'G'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground/40 uppercase tracking-widest">{brand.gymName} Member</div>
              <div className="font-display font-semibold text-sm truncate">{title || 'Home'}</div>
            </div>
            <button className="relative h-9 w-9 rounded-xl bg-foreground/[0.04] border border-foreground/5 flex items-center justify-center">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full" style={{ background: brand.primaryColor }} />
            </button>
          </div>
        </header>

        <div className="px-5 md:px-10 py-6 md:py-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-foreground/5 bg-black/85 backdrop-blur-2xl">
        <div className="max-w-md mx-auto grid grid-cols-5 px-2 pt-1.5 pb-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = pathname === t.href
            return (
              <Link key={t.href} href={t.href} className="relative flex flex-col items-center gap-1 py-2 rounded-lg">
                {active && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute -top-1 h-0.5 w-8 rounded-full" style={{ background: brand.primaryColor }} />}
                <Icon className="h-5 w-5" style={active ? { color: brand.primaryColor } : { color: 'rgba(255,255,255,0.5)' }} />
                <span className="text-[10px] font-medium" style={active ? { color: brand.primaryColor } : { color: 'rgba(255,255,255,0.5)' }}>{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
