'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Shield, Bot, Filter } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { AUDIT_LOGS } from '@/lib/superadmin-mock'

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
                                <th className="text-left px-5 py-3 font-medium">Who</th>
                                <th className="text-left px-5 py-3 font-medium">Role</th>
                                <th className="text-left px-5 py-3 font-medium">Action</th>
                                <th className="text-left px-5 py-3 font-medium">Target</th>
                                <th className="text-left px-5 py-3 font-medium">When</th>
                                <th className="text-left px-5 py-3 font-medium">IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log, i) => {
                                const rc = ROLE_COLORS[log.role] || ROLE_COLORS.system
                                return (
                                    <tr key={log.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02] transition">
                                        <td className="px-5 py-3 flex items-center gap-2">
                                            {log.role === 'super_admin' ? <Shield className="h-3.5 w-3.5" style={{ color: SA }} /> : <Bot className="h-3.5 w-3.5 text-foreground/40" />}
                                            <span className="font-medium">{log.who}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: rc.bg, color: rc.color }}>{log.role === 'super_admin' ? 'Admin' : 'System'}</span>
                                        </td>
                                        <td className="px-5 py-3 text-foreground/80">{log.action}</td>
                                        <td className="px-5 py-3 text-foreground/60">{log.target}</td>
                                        <td className="px-5 py-3 text-xs text-foreground/50">{log.when}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-foreground/40">{log.ip}</td>
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
