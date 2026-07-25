'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Building2, MapPin, Users, Dumbbell, CreditCard, Wifi, WifiOff, Eye, Pencil, Pause, Play, Trash2, ChevronDown, IndianRupee } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateDemoGym } from '@/actions/db/seed'
import { updateGymStatus } from '@/actions/db/gyms'
import { EmptyState } from '@/components/ui/empty-state'

const SA = '#8b5cf6'

const STATUS_COLORS = {
    Active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    Trial: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
    Suspended: { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    Expired: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    Pending: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
}

function formatCurrency(n) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
}

export default function GymsClient({ initialGyms }) {
    const router = useRouter()
    const { impersonateGym } = useAuth()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [planFilter, setPlanFilter] = useState('All')
    const [generating, setGenerating] = useState(false)

    const handleCreateDemo = async () => {
        setGenerating(true)
        toast.info("Minting 20 mock members & gym record...")
        try {
            const res = await generateDemoGym(session?.email)
            if (res?.success) toast.success(`Demo Gym ${res.gymCode} generated successfully!`)
            else toast.error("Failed to generate demo.")
        } catch (e) {
            toast.error("Generation failed")
        } finally {
            setGenerating(false)
        }
    }

    const [gyms, setGyms] = useState(initialGyms.map(g => {
        const trueName = g.gymName || g.name || 'Unnamed Gym';
        return {
            ...g,
            name: trueName,
            status: g.status || 'Active',
            plan: g.plan || 'Basic',
            city: g.city || (g.address ? g.address.split(',')[0] : 'Unknown City'),
            country: g.country || (g.address ? g.address.split(',').pop().trim() : 'IN'),
            logo: trueName[0].toUpperCase(),
            owner: g.ownerName || g.owner || 'Unassigned',
            members: g.members_count || 0,
            trainers: g.trainers_count || 0,
            revenue: g.revenue || 0,
            attendanceToday: g.today_attendance || 0,
            biometricStatus: g.biometricStatus || 'Disconnected',
            connectedDevices: g.connectedDevices || 0
        };
    }));

    const filtered = gyms.filter(g => {
        const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.owner.toLowerCase().includes(search.toLowerCase()) || g.city.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'All' || g.status === statusFilter
        const matchPlan = planFilter === 'All' || g.plan === planFilter
        return matchSearch && matchStatus && matchPlan
    })

    const handleSuspend = async (gym) => {
        setGyms(prev => prev.map(g => g.id === gym.id ? { ...g, status: 'Suspended' } : g))
        await updateGymStatus(gym.id, 'Suspended')
        toast.success(`${gym.name} has been suspended`)
    }
    const handleActivate = async (gym) => {
        setGyms(prev => prev.map(g => g.id === gym.id ? { ...g, status: 'Active' } : g))
        await updateGymStatus(gym.id, 'Active')
        toast.success(`${gym.name} has been activated`)
    }
    const handleDelete = async (gym) => {
        setGyms(prev => prev.filter(g => g.id !== gym.id))
        const { deleteGym } = await import('@/actions/db/gyms')
        const ok = await deleteGym(gym.id)
        if (ok) toast.success(`${gym.name} has been permanently deleted from Firebase`)
        else toast.error(`Failed to delete ${gym.name}`)
    }
    const handleImpersonate = (gym) => {
        impersonateGym(gym)
        toast.success(`Now impersonating ${gym.owner} — ${gym.name}`)
        router.push('/dashboard')
    }

    return (
        <SuperAdminShell title="Gym Management" subtitle={`${gyms.length} gyms on the platform`} actions={
            <div className="flex items-center gap-3">
                <Button onClick={handleCreateDemo} disabled={generating} variant="outline" className="h-9 text-xs border-foreground/10 bg-foreground/[0.04]">
                    {generating ? 'Scaffolding...' : '1-Click Demo Gym'}
                </Button>
                <Link href="/super-admin/gyms/create">
                    <Button className="h-9 text-foreground border-0 text-xs" style={{ background: SA }}><Plus className="h-3.5 w-3.5 mr-1.5" /> Create Gym</Button>
                </Link>
            </div>
        }>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex items-center gap-2 bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-md">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gyms, owners, cities..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-foreground/30" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Trial">Trial</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                </select>
                <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="bg-foreground/[0.04] border border-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground/70 outline-none cursor-pointer">
                    <option value="All">All Plans</option>
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                </select>
                <span className="text-xs text-foreground/40">{filtered.length} results</span>
            </div>

            {/* Gym Cards Grid */}
            {filtered.length === 0 ? (
                <div className="py-20 max-w-md mx-auto">
                    <EmptyState icon="database" title="No Gyms Found" description="There are no gyms deployed on the platform yet. Click Create Gym to provision." />
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((gym, i) => {
                        const s = STATUS_COLORS[gym.status] || STATUS_COLORS.Active
                        return (
                            <div key={gym.id} className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.03] to-transparent p-5 card-hover">
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold font-display text-lg shrink-0 uppercase" style={{ background: `${SA}20`, border: `1px solid ${SA}30` }}>{gym.logo}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-display font-semibold truncate">{gym.name}</div>
                                        <div className="text-xs text-foreground/50 truncate">{gym.owner}</div>
                                        <div className="flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 text-foreground/30" /><span className="text-[10px] text-foreground/40">{gym.city}, {gym.country}</span></div>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{gym.status}</span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center rounded-lg bg-foreground/[0.03] py-2">
                                        <div className="text-[9px] text-foreground/40 uppercase">Members</div>
                                        <div className="font-display text-sm font-bold">{gym.members}</div>
                                    </div>
                                    <div className="text-center rounded-lg bg-foreground/[0.03] py-2">
                                        <div className="text-[9px] text-foreground/40 uppercase">Trainers</div>
                                        <div className="font-display text-sm font-bold">{gym.trainers}</div>
                                    </div>
                                    <div className="text-center rounded-lg bg-foreground/[0.03] py-2">
                                        <div className="text-[9px] text-foreground/40 uppercase">Revenue</div>
                                        <div className="font-display text-sm font-bold">{formatCurrency(gym.revenue)}</div>
                                    </div>
                                </div>

                                {/* Meta Row */}
                                <div className="flex items-center gap-3 text-[10px] text-foreground/40 mb-4">
                                    <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> {gym.plan}</span>
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {gym.attendanceToday} today</span>
                                    <span className="flex items-center gap-1">
                                        {gym.biometricStatus === 'Connected' ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-red-400" />}
                                        {gym.connectedDevices} devices
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => handleImpersonate(gym)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-foreground/5 bg-foreground/[0.03] px-2 py-2 text-[10px] font-medium hover:bg-foreground/[0.08] transition" title="Login as this gym's owner">
                                        <Eye className="h-3 w-3" style={{ color: SA }} /> Open as Owner
                                    </button>

                                    {gym.status === 'Pending' ? (
                                        <button onClick={() => handleActivate(gym)} className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-2 text-[10px] text-blue-400 font-bold transition">
                                            Approve Gym
                                        </button>
                                    ) : gym.status === 'Suspended' ? (
                                        <button onClick={() => handleActivate(gym)} className="h-8 w-8 rounded-lg border border-foreground/5 bg-foreground/[0.03] flex items-center justify-center hover:bg-emerald-500/20 transition" title="Activate"><Play className="h-3 w-3 text-emerald-400" /></button>
                                    ) : (
                                        <button onClick={() => handleSuspend(gym)} className="h-8 w-8 rounded-lg border border-foreground/5 bg-foreground/[0.03] flex items-center justify-center hover:bg-orange-500/20 transition" title="Suspend"><Pause className="h-3 w-3 text-orange-400" /></button>
                                    )}
                                    <button onClick={() => handleDelete(gym)} className="h-8 w-8 rounded-lg border border-foreground/5 bg-foreground/[0.03] flex items-center justify-center hover:bg-red-500/20 transition" title="Delete"><Trash2 className="h-3 w-3 text-red-400" /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </SuperAdminShell>
    )
}
