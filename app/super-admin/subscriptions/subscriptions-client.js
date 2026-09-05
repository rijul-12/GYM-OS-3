'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, AlertTriangle, IndianRupee, RefreshCw, Eye, XCircle } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { approveSubscription, rejectSubscription } from '@/actions/db/subscriptions'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

// Dynamic arrays initialized empty for live production mapping
const REVENUE_MONTHLY = []
const SUBSCRIPTION_PLANS = []

const SA = '#8b5cf6'

import { formatCurrency } from '@/lib/currency'

export default function SubscriptionsClient({ initialRequests, stats }) {
    const [requests, setRequests] = useState(initialRequests)
    const [isPending, startTransition] = useTransition()
    const s = stats

    const handleApprove = (id) => {
        startTransition(async () => {
            await approveSubscription(id)
            setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'Approved' } : r))
        })
    }

    const handleReject = (id) => {
        if (!confirm('Are you sure you want to reject this payment request?')) return;
        startTransition(async () => {
            await rejectSubscription(id)
            setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'Rejected' } : r))
        })
    }

    return (
        <SuperAdminShell title="Subscriptions" subtitle="Manage plans, renewals, and payment verifications">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { icon: CheckCircle2, label: 'Active Gyms', value: s.active, tone: '#22c55e' },
                    { icon: IndianRupee, label: 'MRR', value: formatCurrency(s.totalMRR), tone: SA },
                    { icon: Clock, label: 'Pending Approvals', value: s.pendingPayments, tone: '#eab308' },
                    { icon: AlertTriangle, label: 'Expiring Soon', value: s.upcomingRenewals, tone: '#f97316' },
                ].map((k, i) => (
                    <div key={i} className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 card-hover">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${k.tone}20`, border: `1px solid ${k.tone}40` }}>
                            <k.icon className="h-4 w-4" style={{ color: k.tone }} />
                        </div>
                        <div className="mt-3 text-[10px] uppercase tracking-widest text-foreground/50">{k.label}</div>
                        <div className="font-display text-2xl font-bold mt-1">{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm font-medium mb-1">Revenue Trend</div>
                    <div className="text-xs text-foreground/40 mb-4">Monthly subscription revenue</div>
                    <div className="h-56">
                        {REVENUE_MONTHLY.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center bg-foreground/[0.02] rounded-lg border border-foreground/5">
                                <div className="text-foreground/40 text-sm mb-1">No revenue data yet</div>
                                <div className="text-foreground/20 text-xs text-center px-4">Chart will populate upon first transaction processing.</div>
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <AreaChart data={REVENUE_MONTHLY}>
                                    <defs>
                                        <linearGradient id="subRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SA} stopOpacity={0.4} /><stop offset="100%" stopColor={SA} stopOpacity={0} /></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                    <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} />
                                    <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                    <Area type="monotone" dataKey="revenue" stroke={SA} fill="url(#subRevGrad)" strokeWidth={2.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Plan Highlights */}
                <div className="space-y-4">
                    {SUBSCRIPTION_PLANS.length === 0 ? (
                        <div className="bg-foreground/[0.02] p-8 rounded-2xl border border-foreground/5 h-full flex flex-col justify-center text-center">
                            <div className="text-foreground/40 text-sm mb-1">No plans mapped</div>
                            <div className="text-foreground/20 text-xs">Awaiting Stripe/Razorpay sync.</div>
                        </div>
                    ) : SUBSCRIPTION_PLANS.map((p, i) => (
                        <div key={p.id} className="rounded-2xl border p-4 relative overflow-hidden" style={{ borderColor: `${p.color}40`, background: `linear-gradient(180deg, ${p.color}08, transparent)` }}>
                            <div className="font-display text-lg font-bold">{p.name}</div>
                            <div className="text-sm font-bold mt-0.5" style={{ color: p.color }}>₹{p.price.toLocaleString()}<span className="text-[10px] text-foreground/40 font-normal">/mo</span></div>
                            <div className="text-xs text-foreground/50 mt-1">{p.gyms} gyms subscribed</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending Requests Queue */}
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4" style={{ color: SA }} /><span className="text-sm font-medium">Pending Verifications & Queue</span></div>
                    {isPending && <div className="text-xs text-foreground/50 animate-pulse">Syncing...</div>}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm text-left">
                        <thead className="text-xs font-semibold text-foreground/50 border-b border-foreground/10 sticky top-0 bg-background">
                            <tr>
                                <th className="pb-3 pt-2">Gym</th>
                                <th className="pb-3 pt-2">Plan</th>
                                <th className="pb-3 pt-2">Amount</th>
                                <th className="pb-3 pt-2">Reference / Proof</th>
                                <th className="pb-3 pt-2">Status</th>
                                <th className="pb-3 pt-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-foreground/50 italic">No subscription requests in the queue.</td>
                                </tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="hover:bg-foreground/[0.02] transition-colors">
                                    <td className="py-4 font-medium">{req.gymName}</td>
                                    <td className="py-4 text-foreground/70">{req.plan}</td>
                                    <td className="py-4 font-medium">₹{req.amount}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs">{req.referenceNumber}</span>
                                            {req.paymentProofUrl && <Eye className="h-3.5 w-3.5 text-blue-400 cursor-pointer hover:text-blue-300" />}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : req.status === 'Rejected' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        {req.status === 'Pending' && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" onClick={() => handleApprove(req.id)} className="bg-emerald-500 hover:bg-emerald-600 text-foreground border-0 h-7 text-xs px-3">Approve</Button>
                                                <Button size="sm" onClick={() => handleReject(req.id)} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs px-3">Reject</Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </SuperAdminShell>
    )
}
