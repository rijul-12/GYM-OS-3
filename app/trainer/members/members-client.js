'use client'
import Image from 'next/image'
import { useState, useMemo, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Activity, Calendar, ChevronRight, X, Phone, Mail, AlertCircle, MapPin, Timer, TrendingUp, Trophy, Ruler, Weight, StickyNote, Plus, Flame, ClipboardList, Check, XCircle } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'

import { Button } from '@/components/ui/button'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { addNote, acceptMember, rejectMember } from '@/actions/db/trainer_operations'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const NOTE_TAGS = ['Strength', 'Cardio', 'Nutrition', 'Mobility', 'Recovery', 'Injury', 'General']

const StageBadge = ({ stage }) => (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${stageColor(stage)}18`, color: stageColor(stage) }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor(stage) }} /> {stage}
    </span>
)

export default function TrainerMembersClient({ initialMembers }) {
    const { brand } = useBrand()
    const [q, setQ] = useState('')
    const [filter, setFilter] = useState('All')
    const [sort, setSort] = useState('name')
    const [selectedId, setSelectedId] = useState(null)

    const [noteTag, setNoteTag] = useState('Strength')
    const [noteText, setNoteText] = useState('')

    const [isPending, startTransition] = useTransition()

    // Bind Native Members payload overriding synthetic placeholders
    const members = initialMembers.map(m => ({
        ...m,
        photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`,
        checkIn: false, // Wire to attendance
        stage: m.stage || 'Floor',
        todayWorkout: (m.trainer_plan && m.trainer_plan[new Date().toLocaleString('en-us', { weekday: 'short' })]) || 'General Fitness',
        attendance: 100, // Synthetic placeholder without advanced tracking module
        progress: 50,
        status: m.trainer_status || 'Pending'
    }))

    const selected = members.find(m => m.id === selectedId)

    const filtered = useMemo(() => {
        let arr = members.filter(m => m.name.toLowerCase().includes(q.toLowerCase()))
        if (filter === 'Pending') arr = arr.filter(m => m.status === 'Pending')
        if (filter === 'Active') arr = arr.filter(m => m.status === 'Active')
        if (filter === 'Inside') arr = arr.filter(m => m.checkedIn)
        arr.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name)
            if (sort === 'attendance') return b.attendance - a.attendance
            if (sort === 'progress') return (b.progress || 0) - (a.progress || 0)
            return 0
        })
        return arr
    }, [members, q, filter, sort])

    const handleAddNote = () => {
        if (!noteText.trim() || !selected) return
        startTransition(async () => {
            await addNote(selected.id, noteText, noteTag)
            toast.success('Note stored in Firebase')
            setNoteText('')
        })
    }

    const handleAccept = (e) => {
        e.stopPropagation()
        startTransition(async () => {
            await acceptMember(selected.id)
            toast.success(`${selected.name} accepted!`)
        })
    }

    const handleReject = (e) => {
        e.stopPropagation()
        startTransition(async () => {
            await rejectMember(selected.id)
            setSelectedId(null)
            toast.success(`${selected.name} rejected.`)
        })
    }

    const extras = selected || {}
    const progress = selected?.progress_history || []
    const plan = selected?.trainer_plan || {}
    const memberNotes = selected?.trainer_notes || []

    return (
        <TrainerShell title="Assigned Members" subtitle={`${members.length} clients · manage and track all your active participants`}>

            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 flex-1 min-w-[220px]">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input placeholder="Search assigned members" value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent outline-none text-sm flex-1" />
                </div>
                <div className="flex gap-1 bg-foreground/[0.03] border border-foreground/10 rounded-lg p-1 flex-wrap">
                    {['All', 'Pending', 'Active', 'Inside'].map((t) => (
                        <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === t ? 'text-foreground' : 'text-foreground/50 hover:text-foreground'}`} style={filter === t ? { background: brand.primaryColor } : {}}>{t}</button>
                    ))}
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg bg-foreground/[0.03] border border-foreground/10 px-3 text-sm">
                    <option value="name">Sort: Name</option>
                    <option value="attendance">Sort: Attendance</option>
                    <option value="progress">Sort: Progress</option>
                </select>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((m, i) => (
                    <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedId(m.id)} className="cursor-pointer rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-5 card-hover relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: m.checkedIn ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                            {m.checkedIn ? <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full pulse-red bg-emerald-400" /> INSIDE</span> : 'OUTSIDE'}
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="relative">
                                <Image src={m.photo} className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
                                {m.checkedIn && <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a]" style={{ background: stageColor(m.stage) }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-display font-semibold truncate">{m.name}</div>
                                <div className="text-xs text-foreground/50 truncate">{m.todayWorkout}</div>
                                <div className="mt-2"><StageBadge stage={m.stage} /></div>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-black/30 border border-foreground/5 p-2.5">
                                <div className="text-[9px] uppercase text-foreground/40">Progress</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: stageColor(m.stage) }} />
                                    </div>
                                    <span className="text-[10px] font-mono">{m.progress}%</span>
                                </div>
                            </div>
                            <div className="rounded-lg bg-black/30 border border-foreground/5 p-2.5">
                                <div className="text-[9px] uppercase text-foreground/40">Attendance</div>
                                <div className="font-display text-lg font-bold" style={{ color: brand.primaryColor }}>{m.attendance}%</div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-foreground/50">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'Pending' ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-foreground/50'}`}>{m.status}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedId(null)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                        <motion.div initial={{ x: 500, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 500, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-0 right-0 h-full w-full max-w-xl bg-card border-l border-foreground/10 overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-sm text-foreground/50">Client Profile</div>
                                    <button onClick={() => setSelectedId(null)}><X className="h-5 w-5" /></button>
                                </div>
                                {/* Header */}
                                <div className="flex items-start gap-4">
                                    <Image src={selected.photo} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
                                    <div className="flex-1">
                                        <div className="font-display text-2xl font-bold">{selected.name}</div>
                                        <div className="text-sm text-foreground/50">{selected.plan} · {extras.goal || 'General fitness'}</div>
                                        <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-foreground/70">Attendance {selected.attendance}%</span>
                                            <StageBadge stage={selected.stage} />
                                        </div>
                                        {/* Conditionally inject Accept / Reject capabilities matching instructions without redesigning layout */}
                                        {selected.status === 'Pending' && (
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <Button disabled={isPending} onClick={handleAccept} size="sm" className="h-7 text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0"><Check className="h-3 w-3 mr-1" /> Accept Member</Button>
                                                <Button disabled={isPending} onClick={handleReject} size="sm" variant="outline" className="h-7 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"><XCircle className="h-3 w-3 mr-1" /> Decline</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body stats */}
                                <div className="mt-6 grid grid-cols-4 gap-2 text-center">
                                    {[{ l: 'Height', v: extras.bodyMeasurements?.height || '—', icon: Ruler },
                                    { l: 'Weight', v: extras.bodyMeasurements?.weight || '—', icon: Weight },
                                    { l: 'BMI', v: extras.bmi || '—' },
                                    { l: 'Goal', v: (extras.goal || '—').split(' ')[0] }].map((b, i) => (
                                        <div key={i} className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                                            <div className="text-[10px] uppercase text-foreground/40">{b.l}</div>
                                            <div className="text-sm font-semibold mt-1">{b.v}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress chart */}
                                <div className="mt-6 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Progress · last 8 weeks</div></div>
                                    <div className="h-48 mt-3">
                                        {progress.length > 0 ? (
                                            <ResponsiveContainer>
                                                <LineChart data={progress}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                                    <XAxis dataKey="w" stroke="#ffffff40" fontSize={11} />
                                                    <YAxis stroke="#ffffff40" fontSize={11} />
                                                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                                                    <Line type="monotone" dataKey="bench" stroke={brand.primaryColor} strokeWidth={2.5} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="squat" stroke="#a3a3a3" strokeWidth={2} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex bg-black/20 rounded-xl h-full items-center justify-center text-foreground/40 text-xs">Waiting for {selected?.name} to log workouts.</div>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-xs mt-2">
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded" style={{ background: brand.primaryColor }} /> Bench (lb)</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-white/40" /> Squat (lb)</span>
                                    </div>
                                </div>

                                {/* Weekly plan */}
                                <div className="mt-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Weekly workout plan</div></div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-7 gap-1.5">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                                            <div key={d} className="rounded-lg bg-black/30 border border-foreground/5 p-2 text-center">
                                                <div className="text-[9px] uppercase text-foreground/40">{d}</div>
                                                <div className="text-[11px] font-medium mt-1" style={{ color: plan[d] === 'Rest' || !plan[d] ? 'rgba(255,255,255,0.5)' : brand.primaryColor }}>{plan[d] || 'Rest'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="mt-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2"><StickyNote className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Trainer notes</div></div>
                                        <span className="text-[10px] text-foreground/40">{memberNotes.length} saved</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {memberNotes.length === 0 && <div className="text-xs text-foreground/40">No notes yet.</div>}
                                        {[...memberNotes].reverse().map((n) => (
                                            <div key={n.id} className="rounded-lg bg-black/30 border border-foreground/5 p-3">
                                                <div className="flex items-center gap-2 text-[10px] text-foreground/50"><span className="px-1.5 py-0.5 rounded font-medium" style={{ background: `${brand.primaryColor}22`, color: brand.primaryColor }}>{n.tag}</span> {n.ts}</div>
                                                <div className="text-sm mt-1.5">{n.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <select value={noteTag} onChange={(e) => setNoteTag(e.target.value)} className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-2 text-xs">
                                            {NOTE_TAGS.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                        <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a coaching note…" className="flex-1 h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm outline-none focus:border-foreground/25" />
                                        <Button disabled={isPending} onClick={handleAddNote} className="h-9 text-foreground border-0" style={{ background: brand.primaryColor }}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="mt-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 space-y-3 text-sm">
                                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-foreground/40" /> {selected.phone || 'N/A'}</div>
                                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-foreground/40" /> {selected.email || 'N/A'}</div>
                                    <div className="flex items-start gap-3 text-orange-400"><AlertCircle className="h-4 w-4 mt-0.5" /> <span className="text-foreground/80">{selected.emergencyContact || 'N/A'}</span></div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </TrainerShell>
    )
}
