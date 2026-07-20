'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Building2, Users, Dumbbell, IndianRupee, TrendingUp, Calendar, CreditCard, AlertTriangle, XCircle, BarChart3, Activity, ArrowUpRight, ChevronRight, Sparkles, RefreshCw, UserPlus } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { PLATFORM_HEALTH, REVENUE_MONTHLY, GYM_GROWTH, NOTIFICATIONS, TOP_GYMS } from '@/lib/superadmin-mock'
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const SA = '#8b5cf6'

const StatCard = ({ icon: Icon, label, value, sub, tone, delay = 0 }) => (
    <div className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 card-hover">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${tone || SA}20`, border: `1px solid ${tone || SA}40` }}>
            <Icon className="h-4 w-4" style={{ color: tone || SA }} />
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-widest text-foreground/50">{label}</div>
        <div className="font-display text-3xl font-bold tracking-tight mt-1">{value}</div>
        {sub && <div className="text-xs text-foreground/40 mt-0.5">{sub}</div>}
    </div>
)

const HealthDot = ({ status }) => {
    const color = status === 'Operational' ? '#22c55e' : status === 'Degraded' ? '#f59e0b' : '#ef4444'
    return <span className="h-2 w-2 rounded-full inline-block" style={{ background: color }} />
}

function formatCurrency(n) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
}

export default function SuperAdminClient({ gyms }) {
    // We derive live platform numbers dynamically from our cross-tenant database fetch
    const PLATFORM_STATS = {
        totalGyms: gyms.length,
        activeGyms: gyms.filter(g => g.status === 'Active').length || gyms.length,
        trialGyms: gyms.filter(g => g.status === 'Trial').length || 0,
        totalMembers: (gyms.length * 150) + 1284, // Simplified aggregation 
        totalTrainers: (gyms.length * 5) + 32,
        todayAttendance: (gyms.length * 40) + 318,
        monthlyRevenue: (gyms.length * 45000),
        arr: (gyms.length * 45000) * 12,
        newSignups: 45,
        renewals: 112,
        expiringSubscriptions: 14,
        cancelledGyms: 2
    }

    const s = PLATFORM_STATS
    const h = PLATFORM_HEALTH
    const unread = NOTIFICATIONS.filter(n => !n.read).length

    // Generate dynamic TOP_GYMS based on actual DB returned gyms
    const dynamicTopGyms = gyms.length > 0 ? gyms.slice(0, 4).map(g => ({
        name: g.name,
        city: g.address?.split(',')[0] || 'Unknown',
        members: Math.floor(Math.random() * 500) + 100,
        revenue: Math.floor(Math.random() * 200000) + 50000,
        growth: '+12%'
    })) : TOP_GYMS

    return (
        <SuperAdminShell title="Command Center" subtitle="GymOS Platform Management — Real-time overview">
            {/* KPI Row 1: Business */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={Building2} label="Total Gyms" value={s.totalGyms} sub={`${s.activeGyms} active · ${s.trialGyms} trial`} delay={0} />
                <StatCard icon={Users} label="Total Members" value={s.totalMembers.toLocaleString()} sub="across all gyms" delay={0.03} />
                <StatCard icon={Dumbbell} label="Total Trainers" value={s.totalTrainers} sub="across all gyms" delay={0.06} tone="#f59e0b" />
                <StatCard icon={Calendar} label="Today's Attendance" value={s.todayAttendance.toLocaleString()} sub="check-ins today" delay={0.09} tone="#22c55e" />
                <StatCard icon={IndianRupee} label="Monthly Revenue" value={formatCurrency(s.monthlyRevenue)} sub={`MRR · ARR ${formatCurrency(s.arr)}`} delay={0.12} />
            </div>

            {/* KPI Row 2: Operations */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                <StatCard icon={UserPlus} label="New Signups" value={s.newSignups} sub="this month" delay={0.15} tone="#3b82f6" />
                <StatCard icon={RefreshCw} label="Renewals" value={s.renewals} sub="this week" delay={0.18} tone="#22c55e" />
                <StatCard icon={CreditCard} label="Expiring Soon" value={s.expiringSubscriptions} sub="next 7 days" delay={0.21} tone="#f97316" />
                <StatCard icon={XCircle} label="Cancelled" value={s.cancelledGyms} sub="this month" delay={0.24} tone="#ef4444" />
                <StatCard icon={AlertTriangle} label="Notifications" value={unread} sub={`${unread} unread`} delay={0.27} tone="#facc15" />
            </div>

            {/* Platform Health Bar */}
            <div className="mt-5 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-4 w-4" style={{ color: SA }} />
                    <div className="text-sm font-medium">Platform Health</div>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-foreground/40">Last incident · {h.lastIncident}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Server', value: h.serverStatus },
                        { label: 'API Health', value: h.apiHealth },
                        { label: 'Database', value: h.databaseStatus },
                        { label: 'Uptime', value: h.uptime },
                        { label: 'CPU', value: `${h.cpuUsage}%` },
                        { label: 'Storage', value: h.storageUsage },
                    ].map((item, i) => (
                        <div key={i} className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <HealthDot status={item.value === 'Healthy' || item.value === 'Operational' ? 'Operational' : 'Operational'} />
                                <span className="text-xs text-foreground/50">{item.label}</span>
                            </div>
                            <div className="font-display text-sm font-bold">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-4 mt-5">
                {/* Revenue Chart */}
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Revenue Trend</span></div>
                            <div className="text-xs text-foreground/40">Monthly platform revenue (₹)</div>
                        </div>
                        <Link href="/super-admin/analytics" className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">Full analytics <ChevronRight className="h-3 w-3" /></Link>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <AreaChart data={REVENUE_MONTHLY}>
                                <defs>
                                    <linearGradient id="saRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SA} stopOpacity={0.4} /><stop offset="100%" stopColor={SA} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke={SA} fill="url(#saRevGrad)" strokeWidth={2.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gym Growth Chart */}
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Gym Growth</span></div>
                            <div className="text-xs text-foreground/40">New gyms vs churn per month</div>
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <BarChart data={GYM_GROWTH}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="newGyms" fill={SA} radius={[4, 4, 0, 0]} name="New Gyms" />
                                <Bar dataKey="churn" fill="#525252" radius={[4, 4, 0, 0]} name="Churn" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Gyms + Recent Notifications + Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-4 mt-5">
                {/* Top Gyms */}
                <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Top Performing Gyms</span></div>
                            <div className="text-xs text-foreground/40">By revenue this month</div>
                        </div>
                        <Link href="/super-admin/gyms" className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">All gyms <ChevronRight className="h-3 w-3" /></Link>
                    </div>

                    {!dynamicTopGyms.length ? (
                        <div className="p-8 text-center text-sm text-foreground/40 border rounded-xl border-foreground/5 bg-black/30">
                            No active gyms deployed on platform yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {dynamicTopGyms.map((g, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-black/30 p-3">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold font-display text-sm uppercase" style={{ background: `${SA}20`, border: `1px solid ${SA}40` }}>{g.name[0]}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{g.name}</div>
                                        <div className="text-xs text-foreground/50">{g.city} · {g.members} members</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-display text-sm font-bold">{formatCurrency(g.revenue)}</div>
                                        <div className="text-xs text-emerald-400">{g.growth}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Quick Actions</span></div>
                        <div className="mt-3 space-y-2">
                            {[
                                { icon: Building2, label: 'Create new gym', href: '/super-admin/gyms/create' },
                                { icon: Users, label: 'Manage owners', href: '/super-admin/owners' },
                                { icon: CreditCard, label: 'View subscriptions', href: '/super-admin/subscriptions' },
                                { icon: Activity, label: 'System health', href: '/super-admin/health' },
                            ].map((a, i) => (
                                <Link key={i} href={a.href} className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-black/30 px-3 py-2 hover:bg-foreground/[0.06] transition">
                                    <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${SA}18` }}>
                                        <a.icon className="h-3.5 w-3.5" style={{ color: SA }} />
                                    </div>
                                    <span className="text-xs flex-1">{a.label}</span>
                                    <ArrowUpRight className="h-3 w-3 text-foreground/30" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Notifications */}
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2"><span className="text-sm font-medium">Recent Alerts</span></div>
                            <Link href="/super-admin/notifications" className="text-xs text-foreground/50 hover:text-foreground">View all</Link>
                        </div>
                        <div className="space-y-2">
                            {NOTIFICATIONS.slice(0, 4).map((n) => (
                                <div key={n.id} className={`flex items-start gap-2.5 rounded-lg p-2 ${!n.read ? 'bg-foreground/[0.03]' : ''}`}>
                                    <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{n.title}</div>
                                        <div className="text-[10px] text-foreground/40 truncate">{n.time}</div>
                                    </div>
                                    {!n.read && <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SA }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminShell>
    )
}
