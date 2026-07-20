'use client'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Copy, Edit3, Plus, Calendar, Check } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateWorkoutPlan } from '@/actions/db/trainer_operations'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WORKOUT_TYPES = ['Hypertrophy', 'Strength', 'Endurance', 'Mobility', 'Recovery', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Functional', 'Full Body', 'Rest']

const TYPE_COLOR = {
    Chest: '#ef4444',
    Back: '#f87171',
    Legs: '#22c55e',
    Shoulders: '#facc15',
    Arms: '#84cc16',
    Cardio: '#3b82f6',
    Functional: '#8b5cf6',
    'Full Body': '#ec4899',
    Rest: '#525252',
    Hypertrophy: '#ef4444',
    Strength: '#3b82f6',
    Endurance: '#22c55e',
    Mobility: '#10b981',
    Recovery: '#10b981'
}

export default function TrainerPlansClient({ initialMembers }) {
    const { brand } = useBrand()
    // Maps initial trainer_plan payload onto local reactivity tracking
    const [plans, setPlans] = useState(
        initialMembers.reduce((acc, m) => {
            acc[m.id] = m.trainer_plan || { Mon: 'Rest', Tue: 'Rest', Wed: 'Rest', Thu: 'Rest', Fri: 'Rest', Sat: 'Rest', Sun: 'Rest' }
            return acc
        }, {})
    )
    const [view, setView] = useState('weekly')
    const [isPending, startTransition] = useTransition()

    const setDay = (mid, d, v) => {
        const newPlan = { ...(plans[mid] || {}), [d]: v }
        // Optimistic UI updates
        setPlans({ ...plans, [mid]: newPlan })
        // Sync to DB
        startTransition(async () => {
            await updateWorkoutPlan(mid, newPlan)
        })
    }

    const duplicate = (mid) => {
        toast.info('Duplication requires active selection feature coming soon!')
    }

    return (
        <TrainerShell title="Workout Plans" subtitle="Assign, edit, and orchestrate weekly structural programs pushed natively." actions={<Button style={{ background: brand.primaryColor }} className="h-10 text-foreground border-0"><Plus className="h-4 w-4 mr-2" /> New plan</Button>}>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex gap-1 bg-foreground/[0.03] border border-foreground/10 rounded-lg p-1">
                    {[{ id: 'weekly', label: 'Weekly plan' }, { id: 'monthly', label: 'Monthly plan' }].map((t) => (
                        <button key={t.id} onClick={() => setView(t.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === t.id ? 'text-foreground' : 'text-foreground/50 hover:text-foreground'}`} style={view === t.id ? { background: brand.primaryColor } : {}}>{t.label}</button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {WORKOUT_TYPES.map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5" style={{ background: `${TYPE_COLOR[t] || '#333'}22`, color: TYPE_COLOR[t] || '#aaa' }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[t] || '#aaa' }} /> {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {initialMembers.map((m, i) => {
                    const plan = plans[m.id] || {}
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Image src={m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`} className="h-11 w-11 rounded-full object-cover ring-1 ring-white/10" alt="" width={120} height={120} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-display font-semibold">{m.name}</div>
                                    <div className="text-xs text-foreground/50">{m.plan || 'Assign Program'} · {Object.values(plan).filter(v => v !== 'Rest').length} training days/week</div>
                                </div>
                                <Button onClick={() => duplicate(m.id)} size="sm" variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Copy className="h-3 w-3 mr-1" /> Duplicate</Button>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {DAYS.map((d) => {
                                    const t = plan[d] || 'Rest'
                                    const c = TYPE_COLOR[t] || '#333'
                                    return (
                                        <div key={d} className="rounded-xl border p-3" style={{ borderColor: `${c}35`, background: `${c}0d` }}>
                                            <div className="text-[9px] uppercase text-foreground/40">{d}</div>
                                            <select disabled={isPending} value={t} onChange={(e) => setDay(m.id, d, e.target.value)} className="mt-1 w-full bg-transparent text-xs font-medium outline-none" style={{ color: c }}>
                                                {WORKOUT_TYPES.map(w => <option key={w} value={w} className="bg-card text-foreground">{w}</option>)}
                                            </select>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </TrainerShell>
    )
}
