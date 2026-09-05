'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard, Building2, Users, CreditCard, BarChart3, Activity,
    LifeBuoy, ScrollText, Settings, Bell, Search, Menu, X, LogOut, Eye, XCircle
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { FeedbackButton } from '@/components/feedback'

const SA_COLOR = '#8b5cf6'

const NAV = [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/gyms', label: 'Gyms', icon: Building2 },
    { href: '/super-admin/owners', label: 'Owners', icon: Users },
    { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/super-admin/health', label: 'System Health', icon: Activity },
    { href: '/super-admin/support', label: 'Support', icon: LifeBuoy },
    { href: '/super-admin/audit', label: 'Audit Logs', icon: ScrollText },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
    { href: '/super-admin/notifications', label: 'Notifications', icon: Bell },
]

export function SuperAdminShell({ children, title, subtitle, actions }) {
    const pathname = usePathname()
    const router = useRouter()
    const { signOut, user, impersonating, stopImpersonation } = useAuth()
    const [open, setOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQ, setSearchQ] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const me = user || { name: 'Platform Admin', photo: 'https://i.pravatar.cc/150?img=68', email: 'superadmin@gymos.com' }

    const doLogout = () => { signOut(); router.push('/') }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Impersonation banner */}
            {impersonating && (
                <div
                    className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium animate-in slide-in-from-top duration-300"
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
                >
                    <Eye className="h-4 w-4" />
                    <span>Impersonating <strong>{impersonating.ownerName}</strong> — {impersonating.gymName}</span>
                    <button
                        onClick={stopImpersonation}
                        className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/20 hover:bg-black/40 text-xs font-bold transition"
                    >
                        <XCircle className="h-3.5 w-3.5" /> Stop Impersonation
                    </button>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden font-sans">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setOpen(false)} />
                    <button className="absolute top-4 right-4 z-50 p-3 rounded-xl bg-white/10 text-foreground" onClick={() => setOpen(false)}>
                        <X className="h-6 w-6" />
                    </button>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-foreground/10 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block ${open ? 'translate-x-0' : '-translate-x-full'} ${impersonating ? 'pt-12' : ''}`}>
                <div className="flex flex-col h-full">
                    <div className="h-20 flex items-center px-6">
                        <Link href="/super-admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                            <div className="h-10 w-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <span className="font-display font-bold text-lg text-foreground">SA</span>
                            </div>
                            <div>
                                <h1 className="font-display font-bold text-lg leading-tight tracking-tight">BGM</h1>
                                <p className="text-[10px] uppercase tracking-widest text-purple-400 font-medium">Super Admin</p>
                            </div>
                        </Link>
                    </div>

                    <div className="px-4 py-2">
                        <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/5 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.06] transition text-sm">
                            <Search className="h-4 w-4" /> Quick Search... <kbd className="ml-auto text-[10px] font-sans bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-none">
                        {NAV.map(item => {
                            const Icon = item.icon
                            const active = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${active ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]'}`}>
                                    <Icon className={`h-4 w-4 ${active ? 'text-purple-400' : 'opacity-70'}`} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 mt-auto space-y-2">
                        <FeedbackButton />
                        <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 flex items-center gap-3">
                            <Image src={me.photo} alt={me.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" width={120} height={120} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{me.name}</p>
                                <p className="text-[10px] text-foreground/50 truncate">{me.email}</p>
                            </div>
                            <button onClick={doLogout} className="p-2 rounded-lg bg-white/5 text-red-400 hover:bg-red-400 hover:text-foreground transition" title="Sign out">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-w-0 min-h-screen ${impersonating ? 'pt-12' : ''}`}>
                <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-foreground/10 bg-background/95 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setOpen(true)} className="lg:hidden p-3 -ml-3 rounded-lg text-foreground/70 hover:bg-white/10 active:bg-white/20 transition touch-manipulation">
                            <Menu className="h-6 w-6" />
                        </button>
                        <div>
                            <h2 className="font-display font-bold text-xl lg:text-3xl tracking-tight">{title}</h2>
                            {subtitle && <p className="text-xs lg:text-sm text-foreground/50 mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </header>

                <div className="flex-1 p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>

            {/* Search Modal */}
            {searchOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
                    <div className="relative w-full max-w-xl rounded-xl border border-foreground/10 bg-background shadow-[0_0_80px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-foreground/5">
                            <Search className="h-5 w-5 text-purple-400" />
                            <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search gyms, owners, or settings..." className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-foreground/30 text-lg" />
                            <kbd className="text-[10px] font-sans bg-white/10 px-1.5 py-0.5 rounded text-foreground/50">ESC</kbd>
                        </div>
                        <div className="p-4 min-h-[200px] text-center flex flex-col items-center justify-center text-foreground/30">
                            {searchQ ? <p>No results found for "{searchQ}"</p> : <p>Type to start searching globally</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
