'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, LogIn, Calendar, TrendingUp, ClipboardCheck, ArrowUpRight, ChevronRight, MapPin, Sparkles, Flame } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { StatCard } from '@/components/ui/stat-card'
import { ComingSoonModal } from '@/components/coming-soon-modal'
import { useState } from 'react'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const WORKOUT_DIST = [
    { name: 'Strength', value: 45, color: '#ef4444' },
    { name: 'Cardio', value: 30, color: '#3b82f6' },
    { name: 'Flexibility', value: 15, color: '#10b981' },
    { name: 'Recovery', value: 10, color: '#8b5cf6' }
]

const STATUS_STYLE = {
    'Completed': { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    'In progress': { bg: 'rgba(250,204,21,0.12)', color: '#facc15' },
    'Upcoming': { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8' },
}

export default function TrainerClient({ members }) {
    const { brand } = useBrand()
    const [comingSoon, setComingSoon] = useState(false)

    // Transform DB rows into the expected shapes for this dashboard
    const assigned = members.map((m, i) => ({
        ...m,
        photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.email}`,
        stage: 'Floor',
        checkedIn: i % 3 === 0, // Fallback placeholder logic
        todayWorkout: 'Fat Burn · Zone 4',
        progress: Math.floor(Math.random() * 100),
    }))

    const inside = assigned.filter(m => m.checkedIn)
    const pending = 0

    // Synthetic today schedule matching original design
    const todaySchedule = assigned.slice(0, 3).map((m, i) => ({
        time: ['09:00', '10:30', '14:00'][i],
        member: m.name,
        photo: m.photo,
        type: ['1-on-1 PT', 'Form Check', 'Cardio Review'][i],
        status: ['Completed', 'In progress', 'Upcoming'][i]
    }))

    return (
        <TrainerShell title="Trainer Dashboard" subtitle="Your assigned members, live floor, and today's sessions">
            <ComingSoonModal open={comingSoon} onOpenChange={setComingSoon} title="Trainer AI Workflows" feature="Intelligent Coaching Core" description="GymOS V2 will introduce ML-driven adaptive training plans, connected floor tracking, and in-depth client metrics mapped natively for your gym's coaching staff." />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={Users} label="Assigned members" value={assigned.length} sub="active clients" />
                <StatCard icon={LogIn} label="Currently inside" value={inside.length} sub="live now" tone="#22c55e" />
                <StatCard icon={Calendar} label="Today’s sessions" value={todaySchedule.length} sub="scheduled" tone="#f59e0b" />
                <StatCard icon={ClipboardCheck} label="Today’s attendance" value="92%" sub="of assigned" />
                <StatCard icon={TrendingUp} label="Pending workout updates" value={pending} sub="need your review" tone="#f97316" />
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Workout Zone Demand</div></div>
                        <div className="text-xs text-foreground/40">Live · route your clients around bottlenecks</div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mt-6">
                <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Today’s schedule</div></div>
                            <div className="text-xs text-foreground/40">{todaySchedule.length} sessions</div>
                        </div>
                        <button onClick={() => setComingSoon(true)} className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">See members <ChevronRight className="h-3 w-3" /></button>
                    </div>
                    <div className="space-y-2">
                        {!todaySchedule.length ? (
                            <div className="p-4 text-center border rounded-xl border-foreground/5 bg-black/30">
                                <div className="text-foreground/40 text-sm">No sessions scheduled today</div>
                            </div>
                        ) : todaySchedule.map((s, i) => {
                            const st = STATUS_STYLE[s.status]
                            return (
                                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-black/30 p-3">
                                    <div className="text-center min-w-[70px]">
                                        <div className="text-[9px] uppercase text-foreground/40">Time</div>
                                        <div className="font-display text-sm font-bold tabular-nums">{s.time}</div>
                                    </div>
                                    <Image src={s.photo} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" alt="" width={120} height={120} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{s.member}</div>
                                        <div className="text-xs text-foreground/50 truncate">{s.type}</div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{s.status}</span>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="text-sm font-medium mb-1">Workout distribution</div>
                        <div className="text-xs text-foreground/40 mb-3">Right now on the floor</div>
                        <div className="h-40">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={WORKOUT_DIST} dataKey="value" innerRadius={38} outerRadius={65} paddingAngle={3}>
                                        {WORKOUT_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] mt-1">
                            {WORKOUT_DIST.map((w) => (
                                <div key={w.name} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm" style={{ background: w.color }} /> {w.name}</div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Quick actions</div></div>
                        <div className="mt-3 space-y-2">
                            {[
                                { icon: ClipboardCheck, label: 'Assign new workout', href: '/trainer/plans' },
                                { icon: Flame, label: 'Log completed session', href: '/trainer/progress' },
                                { icon: Users, label: 'Review pending updates', href: '/trainer/members' },
                            ].map((a, i) => (
                                <button key={i} onClick={() => setComingSoon(true)} className="flex w-full items-center gap-3 rounded-lg border border-foreground/5 bg-black/30 px-3 py-2 hover:bg-foreground/[0.06] transition text-left relative">
                                    <div className="h-7 w-7 shrink-0 rounded-md flex items-center justify-center" style={{ background: `${brand.primaryColor}18` }}>
                                        <a.icon className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                                    </div>
                                    <span className="text-xs flex-1">{a.label}</span>
                                    <ArrowUpRight className="h-3 w-3 shrink-0 text-foreground/30" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Your clients currently inside</div></div>
                        <div className="text-xs text-foreground/40">{inside.length} of {assigned.length} training now</div>
                    </div>
                    <button onClick={() => setComingSoon(true)} className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">Full live view <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {!inside.length ? (
                        <div className="col-span-full p-6 text-center border rounded-xl border-foreground/5 bg-black/30">
                            <div className="text-foreground/40 text-sm">None of your assigned members are currently active on the floor.</div>
                        </div>
                    ) : inside.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-foreground/5 bg-black/30 p-3 flex items-center gap-3">
                            <div className="relative">
                                <Image src={m.photo} className="h-10 w-10 rounded-full object-cover" alt="" width={120} height={120} />
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a]" style={{ background: stageColor(m.stage) }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{m.name}</div>
                                <div className="text-[10px] text-foreground/50 truncate">{m.todayWorkout}</div>
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: stageColor(m.stage) }}>{m.progress}%</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </TrainerShell>
    )
}
