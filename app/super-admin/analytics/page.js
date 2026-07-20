'use client'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Building2, MapPin, IndianRupee, Activity, ArrowUpRight } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { GYM_GROWTH, REVENUE_MONTHLY, ATTENDANCE_TREND, TOP_CITIES, TOP_GYMS } from '@/lib/superadmin-mock'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const SA = '#8b5cf6'

function formatCurrency(n) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
    return `₹${n}`
}

export default function AnalyticsPage() {
    return (
        <SuperAdminShell title="Platform Analytics" subtitle="Growth, revenue, attendance, and retention insights">
            {/* Top Row: Growth + Revenue */}
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Gym Growth</span></div>
                    <div className="text-xs text-foreground/40 mb-4">New gyms vs churn per month</div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <BarChart data={GYM_GROWTH}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="newGyms" fill={SA} radius={[4, 4, 0, 0]} name="New Gyms" />
                                <Bar dataKey="churn" fill="#ef4444" radius={[4, 4, 0, 0]} name="Churned" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><IndianRupee className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Revenue Growth</span></div>
                    <div className="text-xs text-foreground/40 mb-4">Monthly platform revenue</div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <AreaChart data={REVENUE_MONTHLY}>
                                <defs>
                                    <linearGradient id="anRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SA} stopOpacity={0.4} /><stop offset="100%" stopColor={SA} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke={SA} fill="url(#anRevGrad)" strokeWidth={2.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Attendance + Retention */}
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4" style={{ color: '#22c55e' }} /><span className="text-sm font-medium">Platform Attendance</span></div>
                    <div className="text-xs text-foreground/40 mb-4">Total monthly check-ins across all gyms</div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <LineChart data={ATTENDANCE_TREND}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} formatter={v => [v.toLocaleString(), 'Check-ins']} />
                                <Line type="monotone" dataKey="attendance" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4" style={{ color: '#f59e0b' }} /><span className="text-sm font-medium">Growth Rate</span></div>
                    <div className="text-xs text-foreground/40 mb-4">Total gyms on platform over time</div>
                    <div className="h-56">
                        <ResponsiveContainer>
                            <AreaChart data={GYM_GROWTH}>
                                <defs>
                                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                <YAxis stroke="#ffffff40" fontSize={11} />
                                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                <Area type="monotone" dataKey="totalGyms" stroke="#f59e0b" fill="url(#growthGrad)" strokeWidth={2.5} name="Total Gyms" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 3: Most Active Cities + Top Gyms */}
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Most Active Cities</span></div>
                    <div className="text-xs text-foreground/40 mb-4">By number of gyms</div>
                    <div className="space-y-2">
                        {TOP_CITIES.map((c, i) => (
                            <div key={c.city} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-black/30 p-3">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${SA}20` }}>#{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{c.city}</div>
                                    <div className="text-[10px] text-foreground/40">{c.gyms} gyms · {c.members.toLocaleString()} members</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-display text-sm font-bold">{formatCurrency(c.revenue)}</div>
                                    <div className="text-[10px] text-foreground/40">/month</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Top Performing Gyms</span></div>
                    <div className="text-xs text-foreground/40 mb-4">By revenue this month</div>
                    <div className="space-y-2">
                        {TOP_GYMS.map((g, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-black/30 p-3">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${SA}20` }}>#{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{g.name}</div>
                                    <div className="text-[10px] text-foreground/40">{g.city} · {g.members} members</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-display text-sm font-bold">{formatCurrency(g.revenue)}</div>
                                    <div className="text-xs text-emerald-400">{g.growth}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SuperAdminShell>
    )
}
