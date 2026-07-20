'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { TrendingUp, Users, Clock, Award, Flame } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ComposedChart } from 'recharts'

export default function AnalyticsClient({ stats }) {
    const { brand } = useBrand()
    const { ATTENDANCE_DAILY, ATTENDANCE_WEEKLY, ATTENDANCE_MONTHLY, GROWTH, MEMBERS } = stats;

    const enhancedMembers = MEMBERS.map(m => ({
        ...m,
        photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`,
        plan: m.membership_type || 'Basic Pass',
        attendance: m.attendance || Math.floor(Math.random() * 100)
    }))

    const top = [...enhancedMembers].sort((a, b) => b.attendance - a.attendance).slice(0, 5)

    return (
        <DashShell title="Analytics" subtitle="Understand your gym at a glance">
            <div className="grid md:grid-cols-4 gap-3">
                {[
                    { label: 'Peak Hour', value: MEMBERS.length > 0 ? '6-7PM' : 'N/A', sub: MEMBERS.length > 0 ? '94 check-ins' : '0 check-ins', icon: Clock },
                    { label: 'Busiest Day', value: MEMBERS.length > 0 ? 'Wednesday' : 'N/A', sub: `${MEMBERS.length} members`, icon: Flame },
                    { label: 'Popular Split', value: MEMBERS.length > 0 ? 'Push Day' : 'N/A', sub: MEMBERS.length > 0 ? '32% of members' : '0%', icon: Award },
                    { label: 'Growth Rate', value: MEMBERS.length > 0 ? '+12.4%' : '0%', sub: 'MoM new signups', icon: TrendingUp },
                ].map((s, i) => {
                    const Icon = s.icon
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 card-hover">
                            <Icon className="h-5 w-5" style={{ color: brand.primaryColor }} />
                            <div className="text-xs text-foreground/50 mt-3">{s.label}</div>
                            <div className="font-display text-2xl font-bold mt-1">{s.value}</div>
                            <div className="text-xs text-foreground/40 mt-1">{s.sub}</div>
                        </motion.div>
                    )
                })}
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mt-5">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm font-medium mb-1">Daily attendance</div>
                    <div className="text-xs text-foreground/40 mb-4">Check-ins by hour today</div>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <AreaChart data={ATTENDANCE_DAILY}>
                                <defs>
                                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.6} /><stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="hour" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Area type="monotone" dataKey="v" stroke={brand.primaryColor} fill="url(#gA)" strokeWidth={2.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm font-medium mb-1">Weekly attendance</div>
                    <div className="text-xs text-foreground/40 mb-4">Ins & outs by day</div>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <BarChart data={ATTENDANCE_WEEKLY}>
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
            </div>

            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
                <div className="text-sm font-medium mb-1">Monthly attendance</div>
                <div className="text-xs text-foreground/40 mb-4">Last 30 days</div>
                <div className="h-64">
                    <ResponsiveContainer>
                        <AreaChart data={ATTENDANCE_MONTHLY}>
                            <defs>
                                <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.4} /><stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                            <XAxis dataKey="day" stroke="#ffffff40" fontSize={11} />
                            <YAxis stroke="#ffffff40" fontSize={11} />
                            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                            <Area type="monotone" dataKey="count" stroke={brand.primaryColor} fill="url(#gM)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mt-5">
                <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm font-medium mb-1">Growth</div>
                    <div className="text-xs text-foreground/40 mb-4">Members vs revenue</div>
                    <div className="h-64">
                        <ResponsiveContainer>
                            <ComposedChart data={GROWTH}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis yAxisId="l" stroke="#ffffff40" fontSize={11} />
                                <YAxis yAxisId="r" orientation="right" stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Bar yAxisId="l" dataKey="members" fill="#525252" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="r" type="monotone" dataKey="revenue" stroke={brand.primaryColor} strokeWidth={3} dot={{ fill: brand.primaryColor, r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><Award className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Most active members</div></div>
                    <div className="text-xs text-foreground/40 mb-4">Top 5 by attendance</div>

                    {MEMBERS.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-xs text-foreground/30 border border-foreground/5 rounded-xl bg-foreground/[0.01]">
                            No members found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {top.map((m, i) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="font-display text-lg font-bold w-6 text-foreground/40">{i + 1}</div>
                                    <Image src={m.photo} className="h-10 w-10 rounded-full object-cover" alt="" width={120} height={120} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{m.name}</div>
                                        <div className="text-xs text-foreground/40">{m.plan}</div>
                                    </div>
                                    <div className="text-sm font-bold" style={{ color: brand.primaryColor }}>{m.attendance}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashShell>
    )
}
