'use client'
import { useState } from 'react'
import { LifeBuoy, Search, Bug, Lightbulb, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { SUPPORT_TICKETS } from '@/lib/superadmin-mock'

const SA = '#8b5cf6'

const PRIORITY_COLORS = {
    High: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    Medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    Low: { bg: 'rgba(163,163,163,0.12)', color: '#a3a3a3' },
}

const STATUS_ICONS = {
    Open: { icon: AlertTriangle, color: '#f97316' },
    'In Progress': { icon: Clock, color: '#3b82f6' },
    Resolved: { icon: CheckCircle2, color: '#22c55e' },
}

const CATEGORY_ICONS = {
    'Bug Report': { icon: Bug, color: '#ef4444' },
    'Feature Request': { icon: Lightbulb, color: '#f59e0b' },
}

export default function SupportPage() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [categoryFilter, setCategoryFilter] = useState('All')

    const filtered = SUPPORT_TICKETS.filter(t => {
        const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.gym.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'All' || t.status === statusFilter
        const matchCat = categoryFilter === 'All' || t.category === categoryFilter
        return matchSearch && matchStatus && matchCat
    })

    const open = SUPPORT_TICKETS.filter(t => t.status === 'Open').length
    const inProgress = SUPPORT_TICKETS.filter(t => t.status === 'In Progress').length
    const resolved = SUPPORT_TICKETS.filter(t => t.status === 'Resolved').length

    return (
        <SuperAdminShell title="Support Center" subtitle="Manage tickets, bug reports, and feature requests">
            <div className="animate-in fade-in duration-500">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                        { label: 'Open', value: open, tone: '#f97316', icon: AlertTriangle },
                        { label: 'In Progress', value: inProgress, tone: '#3b82f6', icon: Clock },
                        { label: 'Resolved', value: resolved, tone: '#22c55e', icon: CheckCircle2 },
                    ].map((s, i) => (
                        <div key={i} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 text-center">
                            <s.icon className="h-5 w-5 mx-auto mb-2" style={{ color: s.tone }} />
                            <div className="font-display text-2xl font-bold">{s.value}</div>
                            <div className="text-[10px] uppercase tracking-widest text-foreground/40 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <div className="flex items-center gap-2 bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
                        <Search className="h-4 w-4 text-foreground/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets by subject, gym, ID..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                        <option value="All">All Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                        <option value="All">All Categories</option>
                        <option value="Bug Report">Bug Reports</option>
                        <option value="Feature Request">Feature Requests</option>
                    </select>
                </div>

                {/* Tickets */}
                <div className="space-y-2">
                    {filtered.map((t, i) => {
                        const pc = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Low
                        const si = STATUS_ICONS[t.status] || STATUS_ICONS.Open
                        const ci = CATEGORY_ICONS[t.category] || CATEGORY_ICONS['Bug Report']
                        const StatusIcon = si.icon
                        const CatIcon = ci.icon
                        return (
                            <div key={t.id} className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 flex items-center gap-4 hover:bg-foreground/[0.04] transition">
                                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: ci.bg || `${ci.color}15`, border: `1px solid ${ci.color}30` }}>
                                    <CatIcon className="h-4 w-4" style={{ color: ci.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-foreground/40">{t.id}</span>
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.color }}>{t.priority}</span>
                                    </div>
                                    <div className="text-sm font-medium mt-0.5 truncate">{t.subject}</div>
                                    <div className="text-[10px] text-foreground/40 mt-0.5">{t.gym} · {t.created}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <StatusIcon className="h-3.5 w-3.5" style={{ color: si.color }} />
                                    <span className="text-xs font-medium" style={{ color: si.color }}>{t.status}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </SuperAdminShell>
    )
}
