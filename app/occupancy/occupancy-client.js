'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Activity, Brain, TrendingUp, Sparkles, Users, Radio, Timer, MapPin, Clock } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid, CrowdHeatmap, ZoneInsightsGrid } from '@/components/zone-demand'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'

import { FeatureGate } from '@/components/feature-gate'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')

const toneStyle = (t) => ({
    critical: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', accent: '#ef4444', label: 'Critical' },
    warning: { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.35)', accent: '#f97316', label: 'Warning' },
    positive: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.30)', accent: '#22c55e', label: 'Opportunity' },
    info: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', accent: '#a3a3a3', label: 'Insight' },
}[t] || { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', accent: '#a3a3a3', label: 'Info' })

const InsightCard = ({ ins, i }) => {
    const s = toneStyle(ins.tone)
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl p-5 relative overflow-hidden card-hover" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40" style={{ background: s.accent }} />
            <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: `${s.accent}25` }}>
                        <Sparkles className="h-3 w-3" style={{ color: s.accent }} />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: s.accent }}>{s.label}</span>
                    <span className="text-[10px] text-foreground/40">· {ins.category}</span>
                    <span className="ml-auto text-[10px] font-mono text-foreground/50">{ins.confidence}% conf.</span>
                </div>
                <div className="font-display font-semibold leading-tight">{ins.title}</div>
                <div className="text-xs text-foreground/60 mt-2 leading-relaxed">{ins.detail}</div>
            </div>
        </motion.div>
    )
}

const StageBadge = ({ stage }) => (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${stageColor(stage)}18`, color: stageColor(stage) }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor(stage) }} /> {stage}
    </span>
)

const zoneOf = (workout = '') => {
    const w = workout.toLowerCase()
    if (w.includes('chest') || w.includes('push')) return 'Chest'
    if (w.includes('back') || w.includes('pull')) return 'Back'
    if (w.includes('leg') || w.includes('squat')) return 'Legs'
    if (w.includes('shoulder')) return 'Shoulders'
    if (w.includes('arm') || w.includes('bicep') || w.includes('tricep')) return 'Arms'
    if (w.includes('cardio') || w.includes('hiit') || w.includes('run')) return 'Cardio'
    if (w.includes('yoga') || w.includes('mobility')) return 'Recovery'
    return 'Mixed'
}

export default function OccupancyClient({ stats, subscription = {} }) {
    const { brand } = useBrand()
    const totalCapacity = stats.totalCapacity || 100;

    const { WORKOUT_DIST, MEMBER_STATUS, AI_INSIGHTS, TRAFFIC_FORECAST, MEMBERS, insideCount } = stats

    // Generate payload to bind to UI 
    const insideMembers = MEMBERS.slice(0, insideCount > 0 ? insideCount : 0).map(m => ({
        ...m,
        photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`,
        stage: m.stage || 'Floor',
        progress: m.progress || 25,
        todayWorkout: m.membership_type || 'General Fitness',
        checkinTime: m.checkinTime || '5m',
        eta: m.eta || '30m'
    }))

    const inside = insideCount;
    const occupancy = Math.round((inside / totalCapacity) * 100)

    return (
        <DashShell title="Live Intelligence" subtitle="Real-time gym floor · workout zone demand · predictive crowd flow">
            <FeatureGate required="heatmaps" currentPlan={subscription.plan} currentPhase={subscription.currentPhase}>
                <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4" style={{ color: brand.primaryColor }} />
                        <div className="text-sm font-medium">AI Intelligence · Live</div>
                        <span className="h-1.5 w-1.5 rounded-full pulse-red" style={{ background: brand.primaryColor }} />
                        <span className="text-xs text-foreground/40">Refreshed just now</span>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {AI_INSIGHTS.slice(0, 3).map((ins, i) => <InsightCard key={ins.id} ins={ins} i={i} />)}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 rounded-2xl border border-foreground/5 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-6 relative overflow-hidden">
                        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl" style={{ background: `${brand.primaryColor}30` }} />
                        <div className="relative">
                            <div className="flex items-center gap-2 text-xs text-foreground/50">
                                <span className="h-2 w-2 rounded-full pulse-red" style={{ background: brand.primaryColor }} />
                                LIVE · Auto-refresh 3s
                            </div>
                            <div className="mt-3 text-sm text-foreground/60">Members inside</div>
                            <div className="font-display text-6xl font-bold tracking-tight mt-2">{inside}<span className="text-2xl text-foreground/40">/{totalCapacity}</span></div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${occupancy}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }} />
                                </div>
                                <div className="text-sm font-semibold">{occupancy}%</div>
                            </div>
                            <div className="mt-6 grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-black/40 border border-foreground/5 p-3">
                                    <div className="text-[10px] text-foreground/50 uppercase tracking-wider">Check-ins</div>
                                    <div className="font-display text-xl font-bold mt-1">{insideCount > 0 ? insideCount * 4 : 0}</div>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-foreground/5 p-3">
                                    <div className="text-[10px] text-foreground/50 uppercase tracking-wider">Avg session</div>
                                    <div className="font-display text-xl font-bold mt-1">{insideCount > 0 ? '72' : '0'}<span className="text-xs text-foreground/40">m</span></div>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-foreground/5 p-3">
                                    <div className="text-[10px] text-foreground/50 uppercase tracking-wider">Peak zone</div>
                                    <div className="font-display text-xl font-bold mt-1">{insideCount > 0 ? 'Chest' : 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Next 6 hours · Predicted crowd flow</div></div>
                            <div className="text-xs" style={{ color: brand.primaryColor }}>{insideCount > 0 ? 'Peak alert 7 PM' : 'Clear patterns detected'}</div>
                        </div>
                        <div className="text-xs text-foreground/40 mb-4">AI forecast with 90% confidence band</div>
                        <div className="h-56">
                            <ResponsiveContainer>
                                <AreaChart data={TRAFFIC_FORECAST}>
                                    <defs>
                                        <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                    <XAxis dataKey="time" stroke="#ffffff40" fontSize={11} />
                                    <YAxis stroke="#ffffff40" fontSize={11} />
                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                    <Area type="monotone" dataKey="predicted" stroke={brand.primaryColor} fill="url(#gF)" strokeWidth={2.5} />
                                    <Area type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Workout Zone Demand</div></div>
                            <div className="text-xs text-foreground/40">Derived from live schedules + check-ins — no exact machine tracking</div>
                        </div>
                    </div>
                    <ZoneDemandGrid />
                </div>

                <div className="mt-6 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Crowd Heatmap · Today</div></div>
                    <div className="text-xs text-foreground/40 mb-4">Predicted crowd level by hour</div>
                    <CrowdHeatmap />
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mt-5">
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Member workout stages</div></div>
                        <div className="text-xs text-foreground/40 mb-5">Where every member is in their session</div>
                        <div className="space-y-3">
                            {MEMBER_STATUS.map((s) => {
                                const max = Math.max(...MEMBER_STATUS.map(x => x.count)) || 1
                                return (
                                    <div key={s.label}>
                                        <div className="flex justify-between items-baseline text-xs mb-1.5">
                                            <span className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                                                <span className="text-foreground/90 font-medium">{s.label}</span>
                                            </span>
                                            <span className="text-foreground/50 font-mono">{s.count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / max) * 100}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: s.color }} />
                                        </div>
                                        <div className="text-[10px] text-foreground/40 mt-1">{s.desc}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Muscle group distribution</div></div>
                        <div className="text-xs text-foreground/40 mb-4">What members are training right now</div>
                        <div className="h-44">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={WORKOUT_DIST} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={3}>
                                        {WORKOUT_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-2">
                            {WORKOUT_DIST.map((w) => (
                                <div key={w.name} className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: w.color }} /> {w.name}</span>
                                    <span className="text-foreground/50">{w.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2"><Users className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Live member feed</div></div>
                            <div className="text-xs text-foreground/40">Today's workout · zone · progress · ETA</div>
                        </div>
                        <span className="text-xs text-foreground/50">{insideMembers.length} inside now</span>
                    </div>
                    {insideMembers.length === 0 ? (
                        <div className="p-8 text-center bg-black/20 rounded-xl border border-foreground/5">
                            <p className="text-foreground/40 text-sm">No members are currently checked in.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {insideMembers.map((m, i) => (
                                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-foreground/5 bg-black/30 p-4 hover:border-foreground/15 transition">
                                    <div className="flex items-start gap-3">
                                        <div className="relative">
                                            <Image src={m.photo} className="h-11 w-11 rounded-full object-cover" alt="" width={120} height={120} />
                                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a]" style={{ background: stageColor(m.stage) }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold truncate">{m.name}</div>
                                                <span className="text-[10px] text-foreground/40">· in {m.checkinTime}</span>
                                            </div>
                                            <div className="text-xs text-foreground/50 truncate">{m.todayWorkout}</div>
                                        </div>
                                        <StageBadge stage={m.stage} />
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-[10px]">
                                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: stageColor(m.stage) }} />
                                        </div>
                                        <span className="text-foreground/50 font-mono">{m.progress}%</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-[11px] text-foreground/50">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {zoneOf(m.todayWorkout)} zone</span>
                                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> ETA {m.eta}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4" style={{ color: brand.primaryColor }} />
                        <div className="text-sm font-medium">Zone-based intelligence</div>
                    </div>
                    <ZoneInsightsGrid insights={AI_INSIGHTS} />
                </div>
            </FeatureGate>
        </DashShell>
    )
}
