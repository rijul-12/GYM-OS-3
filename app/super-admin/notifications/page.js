'use client'
import { useState } from 'react'
import { Bell, Check, Trash2 } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { NOTIFICATIONS } from '@/lib/superadmin-mock'
import { Button } from '@/components/ui/button'

const SA = '#8b5cf6'

export default function NotificationsPage() {
    const [filter, setFilter] = useState('all')
    const [notifications, setNotifications] = useState(NOTIFICATIONS)

    const unreadCount = notifications.filter(n => !n.read).length

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true
        if (filter === 'unread') return !n.read
        return n.type === filter
    })

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const markRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const dismiss = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <SuperAdminShell title="Notifications" subtitle={`You have ${unreadCount} unread system alerts`} actions={
            <Button onClick={markAllRead} variant="outline" className="h-9 bg-foreground/[0.04] border-foreground/10 text-xs hidden sm:flex">
                <Check className="h-3.5 w-3.5 mr-1.5" /> Mark all as read
            </Button>
        }>
            <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">

                {/* Filters Sidebar */}
                <div className="lg:w-56 shrink-0 space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold px-3 py-2">Filter Views</div>
                    {[
                        { id: 'all', label: 'All Notifications', count: notifications.length },
                        { id: 'unread', label: 'Unread Alerts', count: unreadCount },
                        { id: 'alert', label: 'System Alerts', count: notifications.filter(n => n.type === 'alert').length },
                        { id: 'gym', label: 'Gym Events', count: notifications.filter(n => n.type === 'gym').length },
                        { id: 'subscription', label: 'Billing & Subs', count: notifications.filter(n => n.type === 'subscription').length },
                        { id: 'attendance', label: 'Sync & Integrations', count: notifications.filter(n => n.type === 'attendance').length },
                    ].map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${filter === f.id ? 'bg-foreground/[0.06] text-foreground font-medium' : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground'}`}>
                            <span>{f.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-foreground/40'}`}>{f.count}</span>
                        </button>
                    ))}
                </div>

                {/* Notifications Feed */}
                <div className="flex-1 min-w-0">
                    <div>
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-foreground/5 bg-foreground/[0.02]">
                                <Bell className="h-10 w-10 text-foreground/20 mb-4" />
                                <div className="font-display text-lg font-medium">No notifications</div>
                                <div className="text-sm text-foreground/40 mt-1">You're all caught up!</div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((n, i) => (
                                    <div key={n.id} className={`group relative rounded-xl border p-4 sm:p-5 flex gap-4 transition ${n.read ? 'border-foreground/5 bg-foreground/[0.02]' : 'border-purple-500/30 bg-purple-500/5'}`}>
                                        <div className="hidden sm:flex h-10 w-10 shrink-0 rounded-full items-center justify-center text-xl bg-black/40 ring-1 ring-white/10" style={!n.read ? { ringColor: `${SA}40` } : {}}>
                                            {n.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className={`text-sm sm:text-base font-medium ${n.read ? 'text-foreground/80' : 'text-foreground'}`}>{n.title}</div>
                                                    <div className={`text-xs sm:text-sm mt-1 mb-2 ${n.read ? 'text-foreground/50' : 'text-foreground/70'}`}>{n.desc}</div>
                                                </div>
                                                <div className="text-[10px] text-foreground/40 whitespace-nowrap shrink-0 pt-1">{n.time}</div>
                                            </div>

                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                                                {!n.read && (
                                                    <button onClick={() => markRead(n.id)} className="text-[10px] font-medium text-purple-400 hover:text-purple-300">Mark as read</button>
                                                )}
                                                <button onClick={() => dismiss(n.id)} className="text-[10px] font-medium text-red-400 hover:text-red-300 flex items-center"><Trash2 className="h-3 w-3 mr-1" /> Dismiss</button>
                                            </div>
                                        </div>
                                        {!n.read && <div className="absolute top-5 right-5 sm:right-6 h-2 w-2 rounded-full bg-purple-500" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SuperAdminShell>
    )
}
