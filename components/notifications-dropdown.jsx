'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle2, Circle, AlertCircle, Info } from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead } from '@/actions/db/notifications'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBrand } from './brand-provider'

export function NotificationDropdown() {
    const { brand } = useBrand()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchNots = async () => {
        setLoading(true)
        const res = await getNotifications()
        if (res?.success) {
            setNotifications(res.items || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNots()
        // Poll every 30s
        const iv = setInterval(fetchNots, 30000)
        return () => clearInterval(iv)
    }, [])

    const unreadCount = notifications.filter(n => !n.read).length

    const handleRead = async (id, url) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await markAsRead(id)
        if (url) {
            router.push(url)
            setOpen(false)
        }
    }

    const handleMarkAll = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        await markAllAsRead()
    }

    return (
        <div className="relative">
            <motion.button
                onClick={() => { setOpen(!open); if (!open) fetchNots(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative h-10 w-10 md:h-9 md:w-9 rounded-xl bg-foreground/[0.04] border border-foreground/5 flex items-center justify-center hover:bg-foreground/[0.1] transition-colors"
                style={unreadCount > 0 ? { borderColor: `${brand.primaryColor}50` } : {}}
            >
                <Bell className={`h-4 w-4 ${unreadCount > 0 ? '' : 'text-foreground/70'}`} style={unreadCount > 0 ? { color: brand.primaryColor } : {}} />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-[#050505]"
                        style={{ background: brand.primaryColor }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-12 z-50 w-80 max-h-[400px] bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
                        >
                            <div className="p-4 border-b border-foreground/5 flex items-center justify-between bg-foreground/[0.02]">
                                <h3 className="font-display font-semibold text-sm">Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAll} className="text-xs text-foreground/50 hover:text-foreground font-medium transition-colors">
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="overflow-y-auto flex-1 min-h-[100px] p-2 space-y-1 custom-scrollbar">
                                {loading && notifications.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-foreground/40">Loading...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-6 text-center flex flex-col items-center">
                                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                            <CheckCircle2 className="h-5 w-5 text-foreground/30" />
                                        </div>
                                        <div className="text-sm font-medium">You're all caught up!</div>
                                        <div className="text-xs text-foreground/40 mt-1">No new notifications in your feed.</div>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleRead(n.id, n.url)}
                                            className={`w-full text-left p-3 rounded-xl transition-all flex gap-3 group items-start ${n.read ? 'hover:bg-foreground/[0.03]' : 'bg-foreground/[0.04] hover:bg-foreground/[0.06]'}`}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {n.read ? (
                                                    <Circle className="h-2 w-2 text-foreground/20 mt-1" />
                                                ) : (
                                                    <div className="h-2 w-2 rounded-full mt-1 shadow-[0_0_8px_rgba(168,85,247,0.8)]" style={{ background: brand.primaryColor }} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm tracking-tight truncate ${n.read ? 'text-foreground/70 font-medium' : 'text-foreground font-bold'}`}>
                                                    {n.title}
                                                </div>
                                                <div className={`text-xs mt-1 leading-snug line-clamp-2 ${n.read ? 'text-foreground/40' : 'text-foreground/60'}`}>
                                                    {n.message}
                                                </div>
                                                <div className="text-[9px] text-foreground/30 uppercase tracking-widest mt-2">{new Date(n.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
