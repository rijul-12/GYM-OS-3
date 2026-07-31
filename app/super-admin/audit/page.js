'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Shield, Bot, Filter } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { EmptyState } from '@/components/ui/empty-state'

const AUDIT_LOGS = []

const SA = '#8b5cf6'

const ROLE_COLORS = {
    super_admin: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
    system: { bg: 'rgba(163,163,163,0.12)', color: '#a3a3a3' },
}

export default function AuditPage() {
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('All')

    const filtered = AUDIT_LOGS.filter(l => {
        const matchSearch = !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase()) || l.who.toLowerCase().includes(search.toLowerCase())
        const matchRole = roleFilter === 'All' || l.role === roleFilter
        return matchSearch && matchRole
    })

    return (
        <SuperAdminShell title="Audit Logs" subtitle="Complete activity trail — who did what, when">
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex items-center gap-2 bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, targets..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                    <option value="All">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="system">System</option>
                </select>
                <span className="text-xs text-foreground/40">{filtered.length} entries</span>
            </div>

            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs font-semibold text-foreground/50 bg-background sticky top-0 border-b border-foreground/10">
                            <tr>
                                <th className="text-left px-5 py-3 font-medium">Who & Role</th>
                                <th className="text-left px-5 py-3 font-medium">Action</th>
                                <th className="text-left px-5 py-3 font-medium">Target</th>
                                <th className="text-left px-5 py-3 font-medium">Details</th>
                                <th className="text-left px-5 py-3 font-medium">When</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <EmptyState icon="shield" title="No Audit Logs" description="There are no system actions recorded matching the criteria." />
                                    </td>
                                </tr>
                            ) : filtered.map((l, i) => {
                                const rc = ROLE_COLORS[l.role] || ROLE_COLORS.super_admin
                                return (
                                    <tr key={l.id} className="hover:bg-foreground/[0.02] transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded border border-foreground/5 bg-foreground/[0.03] flex items-center justify-center shrink-0">
                                                    {l.role === 'system' ? <Bot className="h-3.5 w-3.5 text-foreground/40" /> : <Shield className="h-3.5 w-3.5 text-foreground/40" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium leading-none mb-1">{l.who}</div>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>{l.role.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5"><div className="text-sm font-medium">{l.action}</div></td>
                                        <td className="px-5 py-3.5"><div className="text-sm font-mono bg-foreground/[0.03] px-2 py-1 rounded inline-block text-foreground/70">{l.target}</div></td>
                                        <td className="px-5 py-3.5">
                                            {l.details ? <div className="text-xs text-foreground/50 max-w-[200px] truncate group-hover:whitespace-normal group-hover:break-words">{l.details}</div> : <span className="text-foreground/20">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                            <div className="text-sm">{l.time}</div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </SuperAdminShell>
    )
}
