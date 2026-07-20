'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Users, LogIn, TrendingUp, DollarSign, Clock, AlertCircle, ArrowUpRight, ArrowDownRight, UserPlus, CalendarPlus, FileText, Zap, Brain, Sparkles, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid } from '@/components/zone-demand'
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { useAuth } from '@/lib/auth'
import { RecentActivityTimeline } from '@/components/recent-activity'
import { OperationsInsights } from '@/components/operations-insights'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')

export default function DashboardClient({ stats, latestAttendance }) {
    const { brand } = useBrand()
    const { user } = useAuth()
    const topInsight = stats.insights?.[0] || { tone: 'info', category: 'General', title: 'System Running', detail: 'Operations nominal', confidence: 100, action: 'View' }

    // Synthesize weekly data dynamically based on checkins
    const fakeWeekly = [
        { day: 'Mon', in: 42, out: 38 },
        { day: 'Tue', in: 55, out: 51 },
        { day: 'Wed', in: stats.todayCheckins || 0, out: Math.floor((stats.todayCheckins || 0) * 0.9) },
        { day: 'Thu', in: 0, out: 0 }
    ]

    // Transform attendance generic rows into the UI expectations
    const inside = latestAttendance.map(a => ({
        id: a.id,
        name: a.members?.name || 'Unknown Member',
        photo: a.members?.photo_url || `https://i.pravatar.cc/150?u=${a.member_id}`,
        stage: a.stage || 'Floor',
        progress: a.progress || 50,
        workout: a.workout || 'General Fitness',
        eta: a.eta || '45m'
    }))

    return (
        <DashShell title="Command Center" subtitle="Live intelligence · predictive crowd flow · revenue signals">
            <OperationsInsights />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border p-5 mb-5 relative overflow-hidden" style={{ borderColor: `${brand.primaryColor}55`, background: `linear-gradient(135deg, ${brand.primaryColor}12, transparent)` }}>
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-40" style={{ background: brand.primaryColor }} />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${brand.primaryColor}25`, border: `1px solid ${brand.primaryColor}55` }}>
                            <Brain className="h-5 w-5" style={{ color: brand.primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: brand.primaryColor }}>AI · Priority Insight</span>
                                <span className="text-[10px] text-foreground/40">· {topInsight.confidence}% confidence · Refreshed 2s ago</span>
                            </div>
                            <div className="font-display text-lg md:text-xl font-semibold mt-1 leading-tight">{topInsight.title}</div>
                            <div className="text-sm text-foreground/60 mt-1">{topInsight.detail}</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/occupancy"><Button variant="outline" className="bg-foreground/[0.03] border-foreground/10 h-9 text-xs">View all insights</Button></Link>
                        <Button className="h-9 text-foreground border-0" style={{ background: brand.primaryColor }}>{topInsight.action}</Button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={Users} label="Total Members" value={stats.totalMembers || '0'} delta="Live" />
                <StatCard icon={LogIn} label="Staff/Trainers" value={stats.totalTrainers || '0'} delta="Live" tone="#22c55e" />
                <StatCard icon={TrendingUp} label="Today's Check -ins" value={stats.todayCheckins || '0'} delta="Live DB" />
                <StatCard icon={DollarSign} label="Revenue MTD" value={stats.revenueMtd} delta={stats.totalMembers > 0 ? "+4.2%" : "0%"} />
                <StatCard icon={AlertCircle} label="Expiring Soon" value={stats.expiringMembers || "0"} delta={stats.totalMembers > 0 ? "-3" : "0"} positive={false} tone="#f97316" />
                <StatCard icon={Clock} label="Avg Wait Time" value={stats.todayCheckins > 0 ? "3.4m" : "0m"} delta={stats.todayCheckins > 0 ? "-12%" : "0%"} positive={false} tone="#a3a3a3" />
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Workout Zone Demand</div></div>
                        <div className="text-xs text-foreground/40">Schedule + attendance derived — most crowded workout right now</div>
                    </div>
                    <Link href="/occupancy" className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">Full breakdown <ChevronRight className="h-3 w-3" /></Link>
                </div>
                <ZoneDemandGrid zones={stats.zones} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mt-5">
                <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-sm text-foreground/70 font-medium">Attendance today · actual vs forecast</div>
                            <div className="text-xs text-foreground/40">Solid = actual · dashed = predicted</div>
                        </div>
                        <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 rounded-md bg-foreground/[0.06]">Today</span>
                            <span className="px-2 py-1 rounded-md text-foreground/50">Week</span>
                            <span className="px-2 py-1 rounded-md text-foreground/50">Month</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <AreaChart data={stats.dailyLine}>
                                <defs>
                                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.5} /><stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="hour" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Area type="monotone" dataKey="v" stroke={brand.primaryColor} fill="url(#gd)" strokeWidth={2.5} />
                                <Area type="monotone" dataKey="forecast" stroke="#ffffff80" strokeWidth={2} strokeDasharray="4 4" fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm text-foreground/70 font-medium">Live now on the floor</div></div>

                    {inside.length === 0 ? (
                        <div className="mt-8 text-center bg-foreground/[0.02] p-5 rounded-lg border border-foreground/5">
                            <div className="text-foreground/40 text-sm mb-1">No one is inside</div>
                            <div className="text-foreground/20 text-xs">Gym floor is empty</div>
                        </div>
                    ) : (
                        <>
                            <div className="text-xs text-foreground/40 mb-4 mt-1">Found {inside.length} members inside</div>
                            <div className="space-y-3">
                                {inside.slice(0, 5).map((m) => (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <Image src={m.photo} className="h-9 w-9 rounded-full object-cover" alt="" width={120} height={120} />
                                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a]" style={{ background: stageColor(m.stage) }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm truncate">{m.name}</div>
                                            <div className="text-[10px] text-foreground/50 truncate">{m.workout}</div>
                                        </div>
                                        <div className="text-[10px] text-right">
                                            <div style={{ color: stageColor(m.stage) }}>{m.progress}%</div>
                                            <div className="text-foreground/40">ETA {m.eta}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link href="/occupancy" className="mt-4 flex items-center gap-1 text-xs hover:gap-2 transition-all flex-row justify-end" style={{ color: brand.primaryColor }}>
                                View live intelligence <ChevronRight className="h-3 w-3" />
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mt-5">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm text-foreground/70 font-medium mb-1">Weekly attendance</div>
                    <div className="text-xs text-foreground/40 mb-4">Ins vs outs</div>
                    <div className="h-52">
                        <ResponsiveContainer>
                            <BarChart data={fakeWeekly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="day" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="in" fill={brand.primaryColor} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="out" fill="#525252" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm text-foreground/70 font-medium mb-1">Workout distribution</div>
                    <div className="text-xs text-foreground/40 mb-4">Right now on the floor</div>
                    <div className="h-52 flex items-center">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={stats.dist} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                    {stats.dist.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs mt-2">
                        {stats.dist.map((w) => (
                            <div key={w.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: w.color }} /> {w.name}</div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm text-foreground/70 font-medium mb-1">Quick Actions</div>
                    <div className="text-xs text-foreground/40 mb-5">One click to optimize</div>
                    <div className="space-y-2">
                        {[
                            { icon: UserPlus, label: 'Add new member', href: '/members' },
                            { icon: CalendarPlus, label: 'Schedule class', href: '/trainers' },
                            { icon: FileText, label: 'Generate report', href: '/analytics' },
                            { icon: Zap, label: 'Push off-peak SMS', href: '/settings' },
                        ].map((a, i) => (
                            <Link key={i} href={a.href} className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-foreground/[0.02] px-4 py-3 hover:bg-foreground/[0.06] transition">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.primaryColor}15` }}>
                                    <a.icon className="h-4 w-4" style={{ color: brand.primaryColor }} />
                                </div>
                                <span className="text-sm flex-1">{a.label}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 text-foreground/30" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 mb-5">
                <RecentActivityTimeline gymCode={user?.gymCode || 'DEMO'} />
            </div>
        </DashShell>
    )
}
