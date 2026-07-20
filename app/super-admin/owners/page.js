'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Search, Users, Building2, CreditCard, Ban, RefreshCw, KeyRound, ArrowLeftRight } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { OWNERS } from '@/lib/superadmin-mock'
import { toast } from 'sonner'

const SA = '#8b5cf6'

const STATUS_COLORS = {
    Active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    Suspended: { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    Inactive: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
}

function formatCurrency(n) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
}

export default function OwnersPage() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [owners, setOwners] = useState(OWNERS)

    const filtered = owners.filter(o => {
        const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.email.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'All' || o.status === statusFilter
        return matchSearch && matchStatus
    })

    const handleSuspend = (owner) => {
        setOwners(prev => prev.map(o => o.id === owner.id ? { ...o, status: o.status === 'Suspended' ? 'Active' : 'Suspended' } : o))
        toast.success(`${owner.name} has been ${owner.status === 'Suspended' ? 'activated' : 'suspended'}`)
    }

    const handleResetPassword = (owner) => {
        toast.success(`Password reset link sent to ${owner.email}`)
    }

    const handleTransfer = (owner) => {
        toast.success(`Ownership transfer initiated for ${owner.name}`)
    }

    return (
        <SuperAdminShell title="Owner Management" subtitle={`${owners.length} gym owners on the platform`}>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex items-center gap-2 bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search owners by name or email..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <span className="text-xs text-foreground/40">{filtered.length} results</span>
            </div>

            {/* Owners Table */}
            <div className="animate-in fade-in duration-500 rounded-2xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs font-semibold text-foreground/50 bg-background sticky top-0 shadow-sm border-b border-foreground/10">
                            <tr>
                                <th className="text-left px-5 py-3 font-medium">Owner</th>
                                <th className="text-left px-5 py-3 font-medium">Contact</th>
                                <th className="text-center px-5 py-3 font-medium">Gyms</th>
                                <th className="text-center px-5 py-3 font-medium">Members</th>
                                <th className="text-center px-5 py-3 font-medium">Plan</th>
                                <th className="text-center px-5 py-3 font-medium">Revenue</th>
                                <th className="text-center px-5 py-3 font-medium">Status</th>
                                <th className="text-center px-5 py-3 font-medium">Last Login</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((o, i) => {
                                const sc = STATUS_COLORS[o.status] || STATUS_COLORS.Active
                                return (
                                    <tr key={o.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02] transition">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <Image src={o.photo} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" alt="" width={120} height={120} />
                                                <div>
                                                    <div className="font-medium">{o.name}</div>
                                                    <div className="text-[10px] text-foreground/40">Joined {o.joinDate}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-xs text-foreground/70">{o.email}</div>
                                            <div className="text-[10px] text-foreground/40">{o.phone}</div>
                                        </td>
                                        <td className="px-5 py-3 text-center"><span className="font-display font-bold">{o.gyms}</span></td>
                                        <td className="px-5 py-3 text-center"><span className="font-display font-bold">{o.totalMembers}</span></td>
                                        <td className="px-5 py-3 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-white/5">{o.plan}</span></td>
                                        <td className="px-5 py-3 text-center font-display font-bold text-sm">{formatCurrency(o.revenue)}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{o.status}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center text-xs text-foreground/50">{o.lastLogin}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleSuspend(o)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-foreground/[0.06] transition" title={o.status === 'Suspended' ? 'Activate' : 'Suspend'}>
                                                    <Ban className="h-3.5 w-3.5 text-foreground/40" />
                                                </button>
                                                <button onClick={() => handleResetPassword(o)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-foreground/[0.06] transition" title="Reset Password">
                                                    <KeyRound className="h-3.5 w-3.5 text-foreground/40" />
                                                </button>
                                                <button onClick={() => handleTransfer(o)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-foreground/[0.06] transition" title="Transfer Ownership">
                                                    <ArrowLeftRight className="h-3.5 w-3.5 text-foreground/40" />
                                                </button>
                                            </div>
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
