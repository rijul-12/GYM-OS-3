'use client'
import Image from 'next/image'
import { FeedbackButton } from '@/components/feedback'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, Activity, BarChart3, Palette, UserCog, CreditCard, Settings, LogOut, Menu, X, Bell, Search, PlugZap, FileClock, RefreshCw, Dumbbell, AlertTriangle, Clock } from 'lucide-react'
import { Logo } from './logo'
import { Input } from '@/components/ui/input'
import { useBrand } from './brand-provider'
import { useAuth } from '@/lib/auth'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/occupancy', label: 'Live Intelligence', icon: Activity },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/trainers', label: 'Trainers', icon: UserCog },
  { href: '/plans', label: 'Plans', icon: CreditCard },
  { href: '/attendance-integrations', label: 'Integrations', icon: PlugZap },
  { href: '/attendance-logs', label: 'Attendance Logs', icon: FileClock },
  { href: '/equipments', label: 'Equipments', icon: Dumbbell },
  { href: '/attendance-sync', label: 'Sync Dashboard', icon: RefreshCw },
  { href: '/branding', label: 'White Label', icon: Palette },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function DashShell({ children, title, subtitle, actions }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { brand } = useBrand()
  const { signOut, user: session } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const doLogout = () => { signOut(); router.push('/') }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-foreground/10 bg-background sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-foreground/5">
          <Link href="/dashboard"><Logo /></Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <motion.div key={item.href} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all shadow-sm hover:shadow ${active ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]'
                    }`}
                >
                  <motion.div whileHover={{ rotate: active ? 0 : [0, -10, 10, -10, 0] }} transition={{ duration: 0.4 }}>
                    <Icon className={`h-4 w-4 transition-colors ${active ? '' : 'text-foreground/40 group-hover:text-foreground/70'}`} style={active ? { color: brand.primaryColor } : {}} />
                  </motion.div>
                  <span className="font-medium">{item.label}</span>
                  {active && <motion.span layoutId="activeNavIndicator" className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: brand.primaryColor }} />}
                </Link>
              </motion.div>
            )
          })}
        </nav>
        <div className="p-3 border-t border-foreground/5 space-y-1">
          <FeedbackButton />
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition cursor-pointer">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }} className="fixed z-50 top-0 left-0 h-full w-72 bg-background border-r border-foreground/10 lg:hidden flex flex-col">
              <div className="px-5 py-5 border-b border-foreground/5 flex items-center justify-between">
                <Logo />
                <button className="p-2.5 -mr-2.5 rounded-lg text-foreground/70 hover:bg-white/5" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV.map((item) => {
                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${active ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60'}`}>
                      <Icon className="h-4 w-4" style={active ? { color: brand.primaryColor } : {}} /> {item.label}
                    </Link>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-foreground/10">
          <div className="px-4 sm:px-8 py-4 flex items-center gap-4">
            <button className="lg:hidden p-2.5 -ml-2.5 rounded-lg text-foreground/70 hover:bg-white/5" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-foreground/50 truncate">{subtitle}</p>}
            </div>
            <div className="hidden md:flex items-center gap-2 bg-foreground/[0.02] border border-foreground/5 rounded-lg px-3 py-2 w-64 hover:bg-foreground/[0.06] transition-colors focus-within:ring-1 focus-within:ring-primary/30">
              <Search className="h-4 w-4 text-foreground/40" />
              <input placeholder="Search members, trainers..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30 transition-all font-medium" />
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative h-10 w-10 rounded-lg bg-foreground/[0.04] border border-foreground/5 flex items-center justify-center hover:bg-foreground/[0.08] transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: brand.primaryColor }} />
            </motion.button>
            {actions}
            <motion.div whileHover={{ scale: 1.05, rotate: 2 }} whileTap={{ scale: 0.95 }} className="h-10 w-10 rounded-lg overflow-hidden ring-1 ring-white/10 shadow-lg cursor-pointer hover:shadow-xl transition-shadow">
              <Image src="https://i.pravatar.cc/80?img=68" alt="admin" className="h-full w-full object-cover origin-center" width={120} height={120} />
            </motion.div>
          </div>
        </header>

        {session?.readOnly && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 sm:px-8 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <span className="text-foreground font-medium">Your subscription has expired. GymOS is locked in Read-Only Mode.</span>
            </div>
            <Link href="/dashboard/subscription" className="bg-red-500 hover:bg-red-600 text-foreground px-4 py-1.5 rounded-md font-medium transition border border-red-400/50 shrink-0">Upgrade Now</Link>
          </div>
        )}
        {!session?.readOnly && session?.subscriptionPhase === 'Trial' && (
          <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 sm:px-8 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-500 shrink-0" />
              <span className="text-foreground">You are utilizing the Free Trial. <strong className="text-purple-400">{session.daysRemaining} days remaining</strong>.</span>
            </div>
            <Link href="/dashboard/subscription" className="bg-purple-500 hover:bg-purple-600 text-foreground px-4 py-1.5 rounded-md font-medium transition shrink-0">View Plans</Link>
          </div>
        )}

        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
          <div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
