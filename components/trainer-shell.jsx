'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, ClipboardList, Radio, TrendingUp, UserCog, Bell, Search, Menu, X, LogOut } from 'lucide-react'
import { useBrand } from './brand-provider'
import { useAuth } from '@/lib/auth'

const CURRENT_TRAINER = { name: "Lead Trainer", role: "Head of PT", photo: "https://i.pravatar.cc/150?u=t" }
const NAV = [
  { href: '/trainer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trainer/members', label: 'Assigned Members', icon: Users },
  { href: '/trainer/plans', label: 'Workout Plans', icon: ClipboardList },
  { href: '/trainer/live', label: 'Live Gym', icon: Radio },
  { href: '/trainer/progress', label: 'Progress', icon: TrendingUp },
  { href: '/trainer/profile', label: 'Profile', icon: UserCog },
]

export function TrainerShell({ children, title, subtitle, actions }) {
  const pathname = usePathname()
  const router = useRouter()
  const { brand } = useBrand()
  const { signOut, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const me = user || { name: CURRENT_TRAINER.name, photo: CURRENT_TRAINER.photo, email: 'trainer@gymos.com' }

  const doLogout = () => { signOut(); router.push('/') }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-foreground/10 bg-background sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-foreground/5">
          <Link href="/trainer" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold font-display text-foreground" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>{brand.logoText || brand.gymName?.[0] || 'G'}</div>
            <div>
              <div className="font-display font-bold tracking-tight">{brand.gymName}</div>
              <div className="text-[10px] text-foreground/40 uppercase tracking-widest">Trainer</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => {
            const active = pathname === n.href
            const Icon = n.icon
            return (
              <motion.div key={n.href} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}>
                <Link href={n.href} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all shadow-sm hover:shadow ${active ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]'}`}>
                  <motion.div whileHover={{ rotate: active ? 0 : [0, -10, 10, -10, 0] }} transition={{ duration: 0.4 }}>
                    <Icon className="h-4 w-4" style={active ? { color: brand.primaryColor } : { color: 'rgba(255,255,255,0.4)' }} />
                  </motion.div>
                  <span className="font-medium">{n.label}</span>
                  {active && <motion.span layoutId="trainerNav" className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: brand.primaryColor }} />}
                </Link>
              </motion.div>
            )
          })}
        </nav>
        <div className="p-3 border-t border-foreground/5">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors border border-transparent hover:border-foreground/10 cursor-pointer">
            <Image src={me.photo} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" alt="" width={120} height={120} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{me.name?.split(' ')[0]}</div>
              <div className="text-[10px] text-foreground/40">Trainer</div>
            </div>
            <button onClick={doLogout} className="text-foreground/40 hover:text-foreground hover:bg-foreground/5 p-1 rounded-md transition-colors"><LogOut className="h-4 w-4" /></button>
          </motion.div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }} className="fixed z-50 top-0 left-0 h-full w-72 bg-background border-r border-foreground/10 lg:hidden flex flex-col">
              <div className="px-5 py-5 border-b border-foreground/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-foreground" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}>{brand.logoText || 'G'}</div>
                  <span className="font-display font-bold">{brand.gymName}</span>
                </div>
                <button className="p-2.5 -mr-2.5 rounded-lg text-foreground/70 hover:bg-white/5" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV.map((n) => {
                  const Icon = n.icon; const active = pathname === n.href
                  return (
                    <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${active ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60'}`}>
                      <Icon className="h-4 w-4" style={active ? { color: brand.primaryColor } : {}} /> {n.label}
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
            <div className="hidden md:flex items-center gap-2 bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 w-56">
              <Search className="h-4 w-4 text-foreground/40" />
              <input placeholder="Search members..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30" />
            </div>
            <button className="relative h-10 w-10 rounded-lg bg-foreground/[0.04] border border-foreground/5 flex items-center justify-center hover:bg-foreground/[0.08]">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: brand.primaryColor }} />
            </button>
            {actions}
            <div className="h-10 w-10 rounded-lg overflow-hidden ring-1 ring-white/10">
              <Image src={me.photo} alt="trainer" className="h-full w-full object-cover" width={120} height={120} />
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
