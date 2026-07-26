'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { blastOffPeakSMS } from '@/actions/sms'
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
    const [isPending, startTransition] = useTransition()
    const topInsight = stats.insights?.[0] || { tone: 'info', category: 'General', title: 'System Running', detail: 'Operations nominal', confidence: 100, action: 'View' }

    // The system now expects `stats.weeklyLine` from Firebase. Fallbacks stripped.
    const weeklyData = stats?.weeklyLine || [];

    // Transform attendance generic rows into the UI expectations
    const inside = (latestAttendance || []).map(a => ({
        id: a.id,
        name: a.members?.name || 'Unknown Member',
        photo: a.members?.photo_url || `https://i.pravatar.cc/150?u=${a.member_id}`,
        stage: a.stage || 'Floor',
        progress: a.progress || 50,
        workout: a.workout || 'General Fitness',
        eta: a.eta || '45m'
    }))

    const sub = stats.subscription || { plan: 'Starter', currentPhase: 'Active', daysRemaining: 0, activeMembers: 0, memberLimit: 75, usageProgressBar: 0, storageUsed: '0 GB' }
    const usageColor = sub.usageProgressBar > 90 ? '#ef4444' : sub.usageProgressBar > 75 ? '#f59e0b' : '#10b981'

    return (
        <DashShell title="Command Center" subtitle="Live intelligence · predictive crowd flow · revenue signals">

            {/* Global Subscription Banner */}
            <div className="mb-6 rounded-2xl border bg-black/40 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden group shadow-lg" style={{ borderColor: `${brand.primaryColor}30` }}>
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent to-background/5" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${brand.primaryColor}08)` }} />
                <div className="relative z-10 flex gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${brand.primaryColor}20`, borderColor: `${brand.primaryColor}40` }}>
                        <Sparkles className="h-6 w-6" style={{ color: brand.primaryColor }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-display font-bold text-lg uppercase tracking-wide">{sub.plan.replace('-monthly', '').replace('-annual', '')} Tier</span>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold" style={{ backgroundColor: sub.currentPhase === 'Active' ? '#10b98120' : '#ef444420', color: sub.currentPhase === 'Active' ? '#10b981' : '#ef4444', border: `1px solid ${sub.currentPhase === 'Active' ? '#10b98140' : '#ef444440'}` }}>
                                {sub.currentPhase}
                            </span>
                        </div>
                        <div className="text-xs text-foreground/50">
                            {sub.currentPhase === 'Trial' ? `${sub.daysRemaining} days remaining in trial` : `Renews in ${sub.daysRemaining} days`} · {sub.storageUsed} Cloud Storage used
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1 w-full lg:max-w-md bg-background/40 border border-foreground/5 p-4 rounded-xl">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium text-foreground/70">Member Usage</span>
                        <span className="font-bold">{sub.activeMembers} <span className="opacity-40">/ {sub.memberLimit === 999999 ? 'Unlimited' : sub.memberLimit}</span></span>
                    </div>

                    <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${sub.usageProgressBar}%`, backgroundColor: usageColor, boxShadow: `0 0 10px ${usageColor}80` }} />
                    </div>
                    {sub.usageProgressBar >= 80 && (
                        <div className="text-[10px] flex items-center gap-1 mt-2" style={{ color: usageColor }}>
                            <AlertCircle className="h-3 w-3" /> Warning: {sub.usageProgressBar}% capacity reached.
                        </div>
                    )}
                </div>
            </div>

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
                            <AreaChart data={stats.dailyLine || []}>
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
                                {(inside || []).slice(0, 5).map((m) => (
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
                        {weeklyData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-foreground/[0.02] rounded-lg border border-foreground/5">
                                <div className="text-foreground/40 text-sm mb-1">No data yet</div>
                                <div className="text-foreground/20 text-xs text-center px-4">Attendance will appear after your first check-in.</div>
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                    <XAxis dataKey="day" stroke="#ffffff40" fontSize={11} />
                                    <YAxis stroke="#ffffff40" fontSize={11} />
                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="in" fill={brand.primaryColor} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="out" fill="#525252" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm text-foreground/70 font-medium mb-1">Workout distribution</div>
                    <div className="text-xs text-foreground/40 mb-4">Right now on the floor</div>
                    <div className="h-52 flex items-center">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={stats?.dist || []} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                    {(stats?.dist || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs mt-2">
                        {(stats?.dist || []).map((w) => (
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
                            {
                                icon: Zap,
                                label: isPending ? 'Dispatching SMS...' : 'Push off-peak SMS',
                                action: () => {
                                    startTransition(async () => {
                                        toast.loading("Finding offline members...", { id: 'sms' });
                                        try {
                                            const res = await blastOffPeakSMS();
                                            if (res.success) {
                                                toast.success(`Off-peak promotion sent to ${res.deliveredCount} offline members!`, { id: 'sms' });
                                            } else {
                                                toast.error(res.error || "Failed to fetch offline members.", { id: 'sms' });
                                            }
                                        } catch (e) {
                                            toast.error("SMS blast failed.", { id: 'sms' });
                                        }
                                    });
                                }
                            },
                        ].map((a, i) => (
                            a.href ? (
                                <Link key={i} href={a.href} className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-foreground/[0.02] px-4 py-3 hover:bg-foreground/[0.06] transition">
                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.primaryColor}15` }}>
                                        <a.icon className="h-4 w-4" style={{ color: brand.primaryColor }} />
                                    </div>
                                    <span className="text-sm flex-1">{a.label}</span>
                                    <ArrowUpRight className="h-3.5 w-3.5 text-foreground/30" />
                                </Link>
                            ) : (
                                <button key={i} onClick={a.action} disabled={isPending} className="flex w-full items-center gap-3 rounded-lg border border-foreground/5 bg-foreground/[0.02] px-4 py-3 hover:bg-foreground/[0.06] transition text-left cursor-pointer disabled:opacity-50">
                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.primaryColor}15` }}>
                                        <a.icon className="h-4 w-4" style={{ color: brand.primaryColor }} />
                                    </div>
                                    <span className="text-sm flex-1">{a.label}</span>
                                    {isPending ? <Clock className="h-3.5 w-3.5 text-foreground/30 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-foreground/30" />}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 mb-5">
                <RecentActivityTimeline gymCode={user?.gymCode} />
            </div>
        </DashShell>
    )
}
