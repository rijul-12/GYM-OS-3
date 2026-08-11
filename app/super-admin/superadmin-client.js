'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Building2, Users, Dumbbell, IndianRupee, TrendingUp, Calendar, CreditCard, AlertTriangle, XCircle, BarChart3, Activity, ArrowUpRight, ChevronRight, Sparkles, RefreshCw, UserPlus } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { EmptyState } from '@/components/ui/empty-state'

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
import { formatCurrency } from '@/lib/currency'

export default function SuperAdminClient({ gyms }) {
    // We derive live platform numbers dynamically from our cross-tenant database fetch
    const PLATFORM_STATS = {
        totalGyms: gyms?.length || 0,
        activeGyms: (gyms || []).filter(g => g.status === 'Active').length || gyms?.length || 0,
        trialGyms: (gyms || []).filter(g => g.status === 'Trial').length || 0,
        totalMembers: 0, // Awaiting Firebase Aggregation across tenants
        totalTrainers: 0, // Awaiting Firebase Aggregation
        todayAttendance: 0, // Awaiting Firebase Aggregation
        monthlyRevenue: 0, // Awaiting Firebase Aggregation
        arr: 0,
        newSignups: 0,
        renewals: 0,
        expiringSubscriptions: 0,
        cancelledGyms: 0
    }

    const s = PLATFORM_STATS

    // Replace Mock with empty state logic until a global health API is provisioned
    const h = { lastIncident: 'System Standby', serverStatus: 'Pending', apiHealth: 'Pending', databaseStatus: 'Pending', uptime: '0%', cpuUsage: 0, storageUsage: '0%' }
    const unread = 0

    const dynamicTopGyms = gyms && gyms.length > 0 ? gyms.slice(0, 4).map(g => {
        const trueName = g.gymName || g.name || 'Unnamed Gym';
        return {
            name: trueName,
            city: g.city || (g.address ? g.address.split(',')[0] : 'Unknown'),
            members: 0,
            revenue: 0,
            growth: '0%'
        };
    }) : [];

    const REVENUE_MONTHLY = []
    const GYM_GROWTH = []
    const NOTIFICATIONS = []

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
                        {REVENUE_MONTHLY.length > 0 ? (
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
                        ) : <EmptyState icon="database" title="No Revenue Data" description="Revenue metrics will appear here once cross-tenant transactions are logged." />}
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
                        {GYM_GROWTH.length > 0 ? (
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
                        ) : <EmptyState icon="database" title="No Gym Analytics" description="Gym growth data will automatically populate upon new gym deployments." />}
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
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold font-display text-sm uppercase" style={{ background: `${SA}20`, border: `1px solid ${SA}40` }}>{g.name ? g.name[0] : 'G'}</div>
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
                        <div className="space-y-4">
                            {NOTIFICATIONS.length === 0 ? (
                                <div className="py-4"><EmptyState icon="file" title="No Alerts" description="All clear for now." /></div>
                            ) : (
                                NOTIFICATIONS.slice(0, 4).map((n) => (
                                    <div key={n.id} className={`flex items-start gap-2.5 rounded-lg p-2 ${!n.read ? 'bg-foreground/[0.03]' : ''}`}>
                                        <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium truncate">{n.title}</div>
                                            <div className="text-[10px] text-foreground/40 truncate">{n.time}</div>
                                        </div>
                                        {!n.read && <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SA }} />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminShell>
    )
}
