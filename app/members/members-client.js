'use client'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Plus, Phone, Mail, Calendar, Activity, ChevronRight, X, AlertCircle, Timer, Dumbbell, Flame, Sparkles, Radio, Users } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { deleteMember, createMember, updateMember, approveMember, deactivateMember, markPaymentPaid } from '@/actions/db/members'
import { GlobalExport } from '@/components/global-export'
import { useAutosave } from '@/hooks/use-autosave'

const stageColor = (s) => (
    { Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5'
)

const StageBadge = ({ stage }) => (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: `${stageColor(stage)}18`, color: stageColor(stage) }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor(stage) }} /> {stage}
    </span>
)

export default function MembersClient({ initialMembers }) {
    const { brand } = useBrand()
    const { user: session } = useAuth()
    const [q, setQ] = useState('')
    const [selected, setSelected] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({})
    const [filter, setFilter] = useState('All')
    const [isPending, startTransition] = useTransition()
    const [pendingDeletes, setPendingDeletes] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [newMember, setNewMember, clearMemberDraft] = useAutosave('gymos_member_draft', { name: '', email: '', phone: '' })

    // Map Supabase rows to UI requirements + handle empty fallbacks
    const enhancedMembers = initialMembers.map(m => {
        const isCheckedIn = false // Connect to real attendance later 
        return {
            ...m,
            photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.email}`,
            plan: m.plan || 'Base Member',
            workoutSplit: m.workoutSplit || 'General Fitness',
            schedule: m.schedule || 'Undecided',
            preferredTime: m.preferredTime || '',
            medicalNotes: m.medicalNotes || 'No known conditions',
            emergencyContact: m.emergencyContact || 'Not provided',
            bodyMeasurements: m.bodyMeasurements || { weight: '', height: '', bodyFat: '' },
            goal: m.goal || 'General Health',
            bmi: m.bmi || null,
            stage: 'Floor',
            checkedIn: isCheckedIn,
            status: m.status || (m.is_active ? 'Active' : 'Pending'),
            payment_status: m.payment_status || 'Unpaid',
            progress: 0,
            joined: new Date(m.created_at).toLocaleDateString(),
            expiry: 'Ongoing',
            phone: m.phone || 'N/A'
        }
    })

    // Safety buffer filtering
    const safeMembers = enhancedMembers.filter(m => !pendingDeletes.includes(m.id))

    const filtered = safeMembers.filter(m => {
        const matchesQ = m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase())
        if (filter === 'All') return matchesQ
        if (filter === 'Inside') return matchesQ && m.checkedIn
        if (filter === 'Offline') return matchesQ && !m.checkedIn
        return matchesQ && (m.status === filter || m.plan === filter)
    })

    const insideCount = enhancedMembers.filter(m => m.checkedIn).length

    const handleSaveEdit = async () => {
        startTransition(async () => {
            await updateMember(selected.id, editForm)
            setSelected({ ...selected, ...editForm })
        })
    }

    const handleDeleteClick = (member) => {
        setPendingDeletes(prev => [...prev, member.id])
        setSelected(null)

        const timer = setTimeout(async () => {
            await deleteMember(member.id)
            setPendingDeletes(prev => prev.filter(id => id !== member.id))
        }, 5000)

        toast('Member removal pending...', {
            description: 'Record will be permanently deleted in 5s.',
            action: {
                label: 'Undo',
                onClick: () => {
                    clearTimeout(timer)
                    setPendingDeletes(prev => prev.filter(id => id !== member.id))
                    toast.success('Record restored')
                }
            }
        })
    }

    return (
        <DashShell
            title="Members"
            subtitle={`${enhancedMembers.length} total · ${insideCount} inside now · live workout tracking`}
            actions={
                <div className="flex items-center gap-3">
                    <GlobalExport data={filtered} filename="members-export.csv" />
                    {!session?.readOnly && (
                        <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                            <Plus className="h-4 w-4 mr-2" /> Add member
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 flex-1 min-w-[240px]">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent outline-none text-sm flex-1" />
                </div>
                <div className="flex gap-1.5 bg-foreground/[0.03] border border-foreground/10 rounded-lg p-1 flex-wrap">
                    {['All', 'Inside', 'Offline', 'Active', 'Expiring'].map((t) => (
                        <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === t ? 'text-foreground' : 'text-foreground/50 hover:text-foreground'}`} style={filter === t ? { background: brand.primaryColor } : {}}>{t}</button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-12 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-foreground/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No members found</h3>
                    <p className="text-foreground/50 text-sm max-w-sm mb-6">
                        {q ? "We couldn't find any members matching your search." : "Your member database is empty. Add your first member to get started."}
                    </p>
                    {!q && !session?.readOnly && (
                        <Button onClick={() => setShowAdd(true)} style={{ background: brand.primaryColor }} className="text-foreground border-0 h-10">
                            <Plus className="h-4 w-4 mr-2" /> Add your first member
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map((m, i) => (
                        <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => { setSelected(m); setEditForm(m); setIsEditing(false); }} className="cursor-pointer rounded-2xl border border-foreground/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-5 card-hover relative overflow-hidden">
                            <div className="flex items-start gap-4">
                                <div className="relative shrink-0">
                                    <Image src={m.photo} className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-display font-semibold truncate">{m.name}</div>
                                    <div className="text-xs text-foreground/50 mt-0.5">{m.plan} · {m.email}</div>
                                    <div className="mt-2 text-[10px] uppercase text-foreground/40 tracking-wider">
                                        {m.status}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-0 right-0 h-full w-full max-w-md bg-card border-l border-foreground/10 overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-sm text-foreground/50">Member Profile</div>
                                    <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="relative">
                                        <Image src={selected.photo} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
                                    </div>
                                    <div>
                                        <div className="font-display text-2xl font-bold">{selected.name}</div>
                                        <div className="text-sm text-foreground/50">{selected.plan} Member</div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : selected.status === 'Pending' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>{selected.status}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.payment_status === 'Paid' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-foreground/50'}`}>{selected.payment_status}</span>
                                        </div>
                                    </div>
                                </div>

                                {!isEditing ? (
                                    <>
                                        <div className="mt-6 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 text-center">
                                                <div className="text-xs text-foreground/50">Joined</div>
                                                <div className="text-sm font-semibold mt-1">{selected.joined}</div>
                                            </div>
                                            <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 text-center">
                                                <div className="text-xs text-foreground/50">Trainer</div>
                                                <div className="text-sm font-semibold mt-1">{selected.trainers?.name || 'Unassigned'}</div>
                                            </div>
                                        </div>

                                        <div className="mt-6 space-y-4">
                                            <div>
                                                <div className="text-xs text-foreground/40 uppercase tracking-wider mb-2">Biological Profile</div>
                                                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm grid grid-cols-2 gap-4">
                                                    <div><span className="text-foreground/40 text-xs block">Weight</span>{selected.bodyMeasurements?.weight || 'N/A'} kg</div>
                                                    <div><span className="text-foreground/40 text-xs block">Height</span>{selected.bodyMeasurements?.height || 'N/A'} cm</div>
                                                    <div><span className="text-foreground/40 text-xs block">BMI</span>{selected.bmi || 'N/A'}</div>
                                                    <div><span className="text-foreground/40 text-xs block">Body Fat</span>{selected.bodyMeasurements?.bodyFat || 'N/A'}%</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-foreground/40 uppercase tracking-wider mb-2">Training Logistics</div>
                                                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm space-y-3">
                                                    <div><span className="text-foreground/40 text-xs block">Goal</span>{selected.goal}</div>
                                                    <div><span className="text-foreground/40 text-xs block">Split</span>{selected.workoutSplit}</div>
                                                    <div><span className="text-foreground/40 text-xs block">Schedule</span>{selected.schedule} • {selected.preferredTime}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-foreground/40 uppercase tracking-wider mb-2">Contact & Medical</div>
                                                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 space-y-3 text-sm">
                                                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-foreground/40" /> {selected.phone}</div>
                                                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-foreground/40" /> {selected.email}</div>
                                                    <div className="pt-2 border-t border-foreground/10 mt-2">
                                                        <span className="text-foreground/40 text-xs block">Medical Notes</span>
                                                        <p className="mt-1 text-red-400">{selected.medicalNotes}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!session?.readOnly && (
                                            <div className="mt-8 flex flex-col gap-2">
                                                {selected.status === 'Pending' && (
                                                    <Button disabled={isPending} onClick={() => startTransition(async () => { await approveMember(selected.id); setSelected({ ...selected, status: 'Active' }) })} className="w-full bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0">Approve Member</Button>
                                                )}
                                                {selected.status === 'Active' && selected.payment_status !== 'Paid' && (
                                                    <Button disabled={isPending} onClick={() => startTransition(async () => { await markPaymentPaid(selected.id); setSelected({ ...selected, payment_status: 'Paid' }) })} className="w-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">Mark Subscription Paid</Button>
                                                )}
                                                {selected.status === 'Active' && (
                                                    <Button disabled={isPending} variant="outline" className="w-full border-orange-500/20 text-orange-500 hover:bg-orange-500/10" onClick={() => startTransition(async () => { await deactivateMember(selected.id); setSelected({ ...selected, status: 'Inactive' }) })}>Deactivate Membership</Button>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button onClick={() => setIsEditing(true)} style={{ background: brand.primaryColor }} className="flex-1 text-foreground border-0">Edit Profile</Button>
                                                    <Button variant="outline" className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteClick(selected)}>
                                                        Delete Member
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="mt-6 space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-3 border-l-2 border-red-500 pl-4">
                                            <div className="text-sm font-semibold">Biological Mapping</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Weight (kg)</label><input value={editForm.bodyMeasurements?.weight || ''} onChange={e => setEditForm({ ...editForm, bodyMeasurements: { ...editForm.bodyMeasurements, weight: e.target.value } })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Height (cm)</label><input value={editForm.bodyMeasurements?.height || ''} onChange={e => setEditForm({ ...editForm, bodyMeasurements: { ...editForm.bodyMeasurements, height: e.target.value } })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Body Fat %</label><input value={editForm.bodyMeasurements?.bodyFat || ''} onChange={e => setEditForm({ ...editForm, bodyMeasurements: { ...editForm.bodyMeasurements, bodyFat: e.target.value } })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">BMI</label><input value={editForm.bmi || ''} onChange={e => setEditForm({ ...editForm, bmi: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 border-l-2 border-blue-500 pl-4">
                                            <div className="text-sm font-semibold">Training Logistics</div>
                                            <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Primary Goal</label><input value={editForm.goal || ''} onChange={e => setEditForm({ ...editForm, goal: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                            <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Workout Split</label><input value={editForm.workoutSplit || ''} onChange={e => setEditForm({ ...editForm, workoutSplit: e.target.value })} placeholder="e.g Push Pull Legs" className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Schedule</label><input value={editForm.schedule || ''} onChange={e => setEditForm({ ...editForm, schedule: e.target.value })} placeholder="Mon-Fri" className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                                <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Preferred Time</label><input type="time" value={editForm.preferredTime || ''} onChange={e => setEditForm({ ...editForm, preferredTime: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                                            <div className="text-sm font-semibold">Administrative</div>
                                            <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Medical Notes</label><textarea value={editForm.medicalNotes || ''} onChange={e => setEditForm({ ...editForm, medicalNotes: e.target.value })} rows={2} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                            <div><label className="text-xs text-foreground/50 uppercase tracking-wider">Emergency Contact</label><input value={editForm.emergencyContact || ''} onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 text-sm mt-1 outline-none" /></div>
                                        </div>

                                        <div className="mt-8 flex gap-2">
                                            <Button disabled={isPending} onClick={handleSaveEdit} style={{ background: brand.primaryColor }} className="flex-1 text-foreground border-0">{isPending ? 'Syncing...' : 'Save Member Data'}</Button>
                                            <Button disabled={isPending} variant="outline" className="flex-1 border-foreground/20 hover:bg-white/10 text-foreground" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}

                {showAdd && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm w-full bg-card border border-foreground/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-lg font-bold">Add New Member</div>
                                <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-foreground/50 hover:text-foreground" /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Full Name</label>
                                    <input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Email Address</label>
                                    <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 uppercase tracking-wider">Mobile Number</label>
                                    <input type="tel" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium mt-1 text-sm" placeholder="9876543210" />
                                </div>
                                <Button
                                    disabled={isPending || !newMember.name || !newMember.email}
                                    style={{ background: brand.primaryColor }}
                                    className="w-full text-foreground border-0 h-11 mt-2 font-medium"
                                    onClick={() => {
                                        startTransition(async () => {
                                            await createMember(newMember);
                                            setShowAdd(false);
                                            clearMemberDraft();
                                            setNewMember({ name: '', email: '', phone: '' });
                                        })
                                    }}
                                >
                                    {isPending ? 'Saving to Database...' : 'Save New Member'}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </DashShell>
    )
}
