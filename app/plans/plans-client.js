'use client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Users, TrendingUp, RefreshCw, Plus, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { createPlan } from '@/actions/db/plans'

export default function PlansClient({ initialPlans, members }) {
    const { brand } = useBrand()
    const [showAdd, setShowAdd] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [newPlan, setNewPlan] = useState({ name: '', price: '', features: '', color: brand.primaryColor, popular: false })

    // Strictly map native Firebase payloads with no synthetic data per Phase 15 requirements
    const enhancedPlans = initialPlans;

    const enhancedMembers = members.map(m => ({
        ...m,
        photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`,
        plan: m.membership_type || 'Basic Pass',
        expiry: m.expiry_date || 'N/A',
        status: m.is_active ? 'Active' : 'Expired'
    }))

    const totalMembers = enhancedPlans.reduce((s, p) => s + p.members, 0)
    const totalRevenue = enhancedPlans.reduce((s, p) => s + p.members * p.price, 0)
    const renewals = enhancedMembers.filter(m => m.status === 'Expiring' || m.status === 'Active')

    return (
        <DashShell
            title="Membership Plans"
            subtitle="Configure pricing and track renewals"
            actions={
                <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                    <Plus className="h-4 w-4 mr-2" /> New Plan
                </Button>
            }
        >
            <div className="grid md:grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="text-xs text-foreground/50">Total subscribed members</div>
                    <div className="font-display text-3xl font-bold mt-1">{totalMembers.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="text-xs text-foreground/50">Monthly recurring revenue</div>
                    <div className="font-display text-3xl font-bold mt-1">{brand.currency?.charAt(0) || '$'}{totalRevenue.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="text-xs text-foreground/50">Renewals this week</div>
                    <div className="font-display text-3xl font-bold mt-1">{renewals.length}</div>
                </div>
            </div>

            {enhancedPlans.length === 0 ? (
                <div className="col-span-3 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-12 text-center mb-8">
                    <div className="text-foreground/40 text-sm mb-4">No active membership plans found in the database.</div>
                    <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                        <Plus className="h-4 w-4 mr-2" /> Create First Plan
                    </Button>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {enhancedPlans.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`relative rounded-2xl border p-7 ${p.popular ? 'border-foreground/20 bg-gradient-to-b from-white/[0.06] to-transparent' : 'border-foreground/5 bg-foreground/[0.02]'}`}>
                            {p.popular && <div className="absolute -top-3 left-6 px-3 py-1 text-xs font-medium rounded-full text-foreground" style={{ background: brand.primaryColor }}>Most popular</div>}
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ background: p.color || brand.primaryColor }} />
                                <div className="font-display text-2xl font-bold">{p.name}</div>
                            </div>
                            <div className="flex items-baseline gap-1 mt-3">
                                <span className="font-display text-4xl font-bold">{brand.currency?.charAt(0) || '$'}{p.price}</span>
                                <span className="text-foreground/40 text-sm">/mo</span>
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-xs text-foreground/50">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.members || 0} members</span>
                                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {brand.currency?.charAt(0) || '$'}{((p.members || 0) * p.price).toLocaleString()}/mo</span>
                            </div>
                            <ul className="space-y-2 mt-6">
                                {(p.features || []).map((f, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm text-foreground/70">
                                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: p.color || brand.primaryColor }} /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Button className={`w-full mt-6 ${p.popular ? 'text-foreground border-0' : 'bg-foreground/[0.06] text-foreground border-0 hover:bg-foreground/[0.12]'}`} style={p.popular ? { background: brand.primaryColor } : {}}>Edit plan</Button>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Upcoming renewals</div></div>
                        <div className="text-xs text-foreground/40">Members expiring soon</div>
                    </div>
                    <Button variant="outline" className="bg-foreground/[0.03] border-foreground/10 text-xs h-9">Export CSV</Button>
                </div>

                {enhancedMembers.length === 0 ? (
                    <div className="p-8 text-center border-t border-foreground/5">
                        <p className="text-foreground/40 text-sm">No active members found on the server.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="text-xs font-semibold text-foreground/50 bg-background sticky top-0 shadow-sm border-b border-foreground/10">
                                <tr>
                                    <th className="text-left px-2 py-3 font-medium">Member</th>
                                    <th className="text-left px-2 py-3 font-medium">Plan</th>
                                    <th className="text-left px-2 py-3 font-medium">Expiry</th>
                                    <th className="text-left px-2 py-3 font-medium">Status</th>
                                    <th className="text-right px-2 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enhancedMembers.slice(0, 6).map((m) => (
                                    <tr key={m.id} className="border-t border-foreground/5">
                                        <td className="px-2 py-3"><div className="flex items-center gap-3"><Image src={m.photo} className="h-8 w-8 rounded-full object-cover" alt="" width={120} height={120} /><span>{m.name || 'Unknown'}</span></div></td>
                                        <td className="px-2 py-3 text-foreground/60">{m.plan}</td>
                                        <td className="px-2 py-3 text-foreground/60">{m.expiry}</td>
                                        <td className="px-2 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-foreground/50'}`}>{m.status}</span></td>
                                        <td className="px-2 py-3 text-right"><button className="text-xs px-3 py-1.5 rounded-md" style={{ background: brand.primaryColor, color: 'white' }}>Manage</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-full bg-card border border-foreground/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-lg font-bold">Create New Plan</div>
                                <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-foreground/50 hover:text-foreground" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Plan Name</label>
                                    <input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="e.g. VIP Pass" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-foreground/50 uppercase tracking-wider">Monthly Price ({brand.currency?.charAt(0) || '$'})</label>
                                        <input type="number" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="49.99" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-foreground/50 uppercase tracking-wider">Hex Color</label>
                                        <input type="text" value={newPlan.color} onChange={(e) => setNewPlan({ ...newPlan, color: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Plan Features (Comma separated)</label>
                                    <textarea value={newPlan.features} onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm resize-none" placeholder="24/7 Access, Pool, Locker" rows={3} />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-foreground/70">
                                    <input type="checkbox" checked={newPlan.popular} onChange={(e) => setNewPlan({ ...newPlan, popular: e.target.checked })} /> Mark as Most Popular
                                </label>
                                <Button
                                    disabled={isPending || !newPlan.name || !newPlan.price}
                                    style={{ background: brand.primaryColor }}
                                    className="w-full text-foreground border-0 h-11 mt-2 font-medium"
                                    onClick={() => {
                                        startTransition(async () => {
                                            await createPlan(newPlan);
                                            setShowAdd(false);
                                            setNewPlan({ name: '', price: '', features: '', color: brand.primaryColor, popular: false });
                                        })
                                    }}
                                >
                                    {isPending ? 'Syncing to Registry...' : 'Save Plan Package'}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashShell>
    )
}
