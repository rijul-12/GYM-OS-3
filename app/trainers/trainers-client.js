'use client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Users, Calendar, TrendingUp, Plus, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { createTrainer, approveTrainer, suspendTrainer, removeTrainer } from '@/actions/db/trainers'

export default function TrainersClient({ initialTrainers }) {
    const { brand } = useBrand()
    const [q, setQ] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [newTrainer, setNewTrainer] = useState({ name: '', specialty: '', email: '', salary: '' })

    // Polyfill mapping adding placeholder visual data if missing in DB
    const enhancedTrainers = initialTrainers.map(t => ({
        ...t,
        photo: t.photo || `https://i.pravatar.cc/150?u=${t.id}`,
        rating: t.rating || 5.0,
        members: t.members || 0,
        performance: t.performance || 100,
        schedule: t.schedule || 'M-F, 9am-5pm'
    }))

    const filtered = enhancedTrainers.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.specialty?.toLowerCase().includes(q.toLowerCase()))

    return (
        <DashShell
            title="Trainers & Staff"
            subtitle={`${enhancedTrainers.length} coaches on your roster`}
            actions={
                <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                    <Plus className="h-4 w-4 mr-2" /> Add trainer
                </Button>
            }
        >
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-12 flex flex-col items-center justify-center text-center mt-4">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-foreground/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No trainers found</h3>
                    <p className="text-foreground/50 text-sm max-w-sm mb-6">
                        Your coaching roster is empty. Add your first trainer to assign members and schedule workouts.
                    </p>
                    <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                        <Plus className="h-4 w-4 mr-2" /> Hire first trainer
                    </Button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((t, i) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 card-hover">
                            <div className="flex items-start gap-4">
                                <div className="relative">
                                    <Image src={t.photo} alt={t.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/10" width={120} height={120} />
                                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-black" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-display text-lg font-semibold truncate">{t.name}</div>
                                    <div className="text-xs text-foreground/50">{t.specialty}</div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs font-medium">{t.rating}</span>
                                        <span className="text-xs text-foreground/40">· {t.members} members</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-black/40 border border-foreground/5 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-foreground/40">Performance</div>
                                    <div className="font-display text-xl font-bold mt-1" style={{ color: brand.primaryColor }}>{t.performance}%</div>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-foreground/5 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-foreground/40">Members</div>
                                    <div className="font-display text-xl font-bold mt-1">{t.members}</div>
                                </div>
                            </div>

                            <div className="mt-3 rounded-lg bg-black/40 border border-foreground/5 p-3">
                                <div className="flex items-center gap-2 text-xs"><Calendar className="h-3.5 w-3.5 text-foreground/40" /> <span className="text-foreground/70">{t.schedule}</span></div>
                            </div>

                            <div className="mt-5 flex gap-2">
                                {t.status === 'Pending' ? (
                                    <Button disabled={isPending} onClick={() => startTransition(async () => await approveTrainer(t.id))} className="flex-1 h-9 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0 text-xs">Approve Hire</Button>
                                ) : t.status === 'Suspended' ? (
                                    <Button disabled={isPending} onClick={() => startTransition(async () => await approveTrainer(t.id))} className="flex-1 h-9 bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 border-0 text-xs">Restore Staff</Button>
                                ) : (
                                    <>
                                        <Button disabled={isPending} onClick={() => startTransition(async () => await removeTrainer(t.id))} variant="outline" className="flex-1 h-9 bg-foreground/[0.03] border-red-500/30 text-red-500 text-[11px] font-bold hover:bg-red-500/10">REMOVE</Button>
                                        <Button className="flex-1 h-9 text-foreground border-0 text-xs" style={{ background: brand.primaryColor }}>Message</Button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAdd && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-full bg-card border border-foreground/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-lg font-bold">Hire New Trainer</div>
                                <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-foreground/50 hover:text-foreground" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Full Name</label>
                                    <input value={newTrainer.name} onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="David Goggins" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Email Address</label>
                                    <input type="email" value={newTrainer.email} onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="david@gymos.com" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Specialty / Role</label>
                                    <input type="text" value={newTrainer.specialty} onChange={(e) => setNewTrainer({ ...newTrainer, specialty: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="Head Strength Coach" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Salary Offering (₹/month)</label>
                                    <input type="number" value={newTrainer.salary} onChange={(e) => setNewTrainer({ ...newTrainer, salary: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="35000" />
                                </div>
                                <Button
                                    disabled={isPending || !newTrainer.name || !newTrainer.email}
                                    style={{ background: brand.primaryColor }}
                                    className="w-full text-foreground border-0 h-11 mt-2 font-medium"
                                    onClick={() => {
                                        startTransition(async () => {
                                            await createTrainer(newTrainer);
                                            setShowAdd(false);
                                            setNewTrainer({ name: '', specialty: '', email: '', salary: '' });
                                        })
                                    }}
                                >
                                    {isPending ? 'Processing Onboarding...' : 'Send Invite'}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashShell>
    )
}
