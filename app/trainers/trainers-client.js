'use client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Users, Calendar, TrendingUp, Plus, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { getInitials, getAvatarColor } from '@/lib/avatar'
import { createTrainer, approveTrainer, suspendTrainer, removeTrainer, updateTrainerProfile } from '@/actions/db/trainers'

export default function TrainersClient({ initialTrainers }) {
    const { brand } = useBrand()
    const [q, setQ] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [newTrainer, setNewTrainer] = useState({ name: '', specialty: '', email: '', salary: '' })
    const [editingTrainer, setEditingTrainer] = useState(null)
    const [editForm, setEditForm] = useState({})

    const handleSaveEdit = () => {
        startTransition(async () => {
            await updateTrainerProfile(editingTrainer.id, editForm);
            setEditingTrainer(null);
            // Revalidation will refresh the client naturally
        });
    }

    // Polyfill mapping adding placeholder visual data if missing in DB
    const enhancedTrainers = initialTrainers.map(t => ({
        ...t,
        photo: t.photo || null,
        rating: t.rating || 5.0,
        members: t.members || 0,
        performance: t.performance || 100,
        schedule: t.schedule || 'M-F, 9am-5pm',
        status: t.status || 'Active',
        phone: t.phone || 'Not provided'
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
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-12 flex flex-col items-center justify-center text-center mt-4">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-foreground/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No trainers found</h3>
                    <p className="text-foreground/50 text-sm max-w-sm mb-6">
                        Your coaching roster is empty. Add your first trainer to assign members and schedule workouts.
                    </p>
                    <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10 hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl">
                        <Plus className="h-4 w-4 mr-2" /> Hire first trainer
                    </Button>
                </motion.div>
            ) : (
                <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((t, i) => (
                            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.05 }} key={t.id} whileHover={{ y: -4 }} className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 hover:shadow-xl hover:border-foreground/10 transition-all group">
                                <div className="flex items-start gap-4">
                                    <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
                                        {t.photo ? (
                                            <Image src={t.photo} alt={t.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-white/20 transition-all" width={120} height={120} />
                                        ) : (
                                            <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-display font-bold text-xl ring-2 ring-white/10 group-hover:ring-white/20 transition-all" style={{ backgroundColor: getAvatarColor(t.name), color: '#fff' }}>
                                                {getInitials(t.name)}
                                            </div>
                                        )}
                                        {t.status === 'Active' && <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-black" />}
                                        {t.status === 'Suspended' && <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-orange-500 border-2 border-black" />}
                                    </motion.div>
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
                                            <Button disabled={isPending} onClick={() => { setEditingTrainer(t); setEditForm(t); }} className="flex-1 h-9 text-foreground border-0 text-xs bg-foreground/[0.05] hover:bg-foreground/[0.1]">Edit Trainer</Button>
                                            <Button className="flex-1 h-9 text-foreground border-0 text-xs" style={{ background: brand.primaryColor }}>Message</Button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
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

                {editingTrainer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTrainer(null)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-0 right-0 h-full w-full max-w-md bg-card border-l border-foreground/10 overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="text-xl font-bold font-display">Edit Trainer</div>
                                    <button onClick={() => setEditingTrainer(null)}><X className="h-5 w-5 text-foreground/50 hover:text-foreground" /></button>
                                </div>

                                <div className="space-y-5">
                                    <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Full Name</label><input value={editForm.name || ''} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none" /></div>
                                    <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Phone</label><input type="tel" value={editForm.phone || ''} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none" /></div>
                                    <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Specialty</label><input value={editForm.specialty || ''} onChange={e => setEditForm(prev => ({ ...prev, specialty: e.target.value }))} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none" /></div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Assigned Members</label><input type="number" value={editForm.members || 0} onChange={e => setEditForm(prev => ({ ...prev, members: parseInt(e.target.value) || 0 }))} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none" /></div>
                                        <div>
                                            <label className="text-xs text-foreground/50 uppercase tracking-wider">Status</label>
                                            <select value={editForm.status || 'Active'} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none appearance-none">
                                                <option value="Active" className="text-black">Active</option>
                                                <option value="Suspended" className="text-black">Suspended (Inactive)</option>
                                                <option value="Pending" className="text-black">Pending</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Availability</label><input value={editForm.schedule || ''} onChange={e => setEditForm(prev => ({ ...prev, schedule: e.target.value }))} placeholder="e.g Mon-Fri 9-5" className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 text-sm mt-1 outline-none" /></div>

                                    <div className="mt-8 flex gap-2">
                                        <Button disabled={isPending} onClick={handleSaveEdit} style={{ background: brand.primaryColor }} className="flex-1 text-foreground border-0">{isPending ? 'Syncing...' : 'Save Trainer'}</Button>
                                        <Button disabled={isPending} variant="outline" className="flex-1 border-red-500/20 hover:bg-red-500/10 text-red-500" onClick={() => {
                                            startTransition(async () => {
                                                await removeTrainer(editingTrainer.id);
                                                setEditingTrainer(null);
                                            })
                                        }}>Remove</Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashShell >
    )
}
