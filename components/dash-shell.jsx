'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, Activity, BarChart3, Palette, UserCog, CreditCard, Settings, LogOut, Menu, X, Bell, Search, PlugZap, FileClock, RefreshCw, Dumbbell } from 'lucide-react'
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
  const { signOut } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const doLogout = () => { signOut(); router.push('/') }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-white/5">
          <Link href="/dashboard"><Logo /></Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-white/[0.06] text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <Icon className={`h-4 w-4 ${active ? '' : 'text-white/40 group-hover:text-white/70'}`} style={active ? { color: brand.primaryColor } : {}} />
                <span className="font-medium">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: brand.primaryColor }} />}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.03] transition">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }} className="fixed z-50 top-0 left-0 h-full w-72 bg-[#0a0a0a] border-r border-white/5 lg:hidden flex flex-col">
              <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
                <Logo />
                <button className="p-2.5 -mr-2.5 rounded-lg text-white/70 hover:bg-white/5" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV.map((item) => {
                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${active ? 'bg-white/[0.06] text-white' : 'text-white/60'}`}>
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
        <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 sm:px-8 py-4 flex items-center gap-4">
            <button className="lg:hidden p-2.5 -ml-2.5 rounded-lg text-white/70 hover:bg-white/5" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-white/50 truncate">{subtitle}</p>}
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-lg px-3 py-2 w-64">
              <Search className="h-4 w-4 text-white/40" />
              <input placeholder="Search members, trainers..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-white/30" />
            </div>
            <button className="relative h-10 w-10 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center hover:bg-white/[0.08]">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: brand.primaryColor }} />
            </button>
            {actions}
            <div className="h-10 w-10 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src="https://i.pravatar.cc/80?img=68" alt="admin" className="h-full w-full object-cover" width={120} height={120} />
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
          <div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
