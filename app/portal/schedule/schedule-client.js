'use client'
import { useState, useTransition } from 'react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'
import { Activity, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMember } from '@/actions/db/members'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Cardio', 'Mobility', 'Full Body', 'Rest']

export default function ScheduleClient({ initialData }) {
    const { brand } = useBrand()
    const [isPending, startTransition] = useTransition()

    // Ensure array-based model
    const defaultSchedule = { Monday: ['Chest'], Tuesday: ['Back'], Wednesday: ['Rest'], Thursday: ['Legs'], Friday: ['Shoulders', 'Arms'], Saturday: ['Cardio'], Sunday: ['Rest'] }

    // Normalize legacy generic strings into arrays
    let initSched = initialData.weeklySchedule || defaultSchedule;
    Object.keys(initSched).forEach(day => {
        if (!Array.isArray(initSched[day])) {
            initSched[day] = [initSched[day]].filter(Boolean);
        }
    })

    const [schedule, setSchedule] = useState(initSched)

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateMember(initialData.id, { weeklySchedule: schedule })
                toast.success('Live Biological Schedule Synced!')
            } catch (err) {
                toast.error('Failed to sync schedule.')
            }
        })
    }

    return (
        <PortalShell title="Biological Schedule">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
                <Activity className="h-4 w-4" /> Demand Tracking
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Biological Schedule</h1>
            <p className="text-sm text-foreground/50 mt-2 mb-8 max-w-2xl">Maintain your 7-day physical muscle map matrix accurately. This trajectory fuels the Live Demand prediction engine allowing everyone in your workspace to monitor precise floor capacity limits organically.</p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 rounded-3xl border border-foreground/5 bg-foreground/[0.02]">
                <div className="grid gap-6">
                    {Object.keys(schedule).map((day) => (
                        <div key={day} className="flex flex-col md:flex-row md:items-start gap-4 p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5">
                            <div className="md:w-32 font-display text-lg font-bold text-foreground/90 mt-1">{day}</div>
                            <div className="flex-1 flex flex-wrap gap-2">
                                {MUSCLES.map(m => {
                                    const isSelected = schedule[day].includes(m);
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                let newArr = [...schedule[day]];
                                                if (isSelected) {
                                                    newArr = newArr.filter(x => x !== m);
                                                } else {
                                                    if (m === 'Rest') newArr = ['Rest']; // Rest clears others
                                                    else {
                                                        newArr = newArr.filter(x => x !== 'Rest');
                                                        newArr.push(m);
                                                    }
                                                }
                                                if (newArr.length === 0) newArr = ['Rest'];

                                                setSchedule({ ...schedule, [day]: newArr });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center ${isSelected ? '' : 'bg-transparent text-foreground/50 border-foreground/10 hover:bg-foreground/[0.05]'}`}
                                            style={isSelected ? { background: `${brand.primaryColor}20`, color: brand.primaryColor, borderColor: `${brand.primaryColor}50` } : {}}
                                        >
                                            {m}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-8 border-t border-foreground/10 flex justify-end">
                    <Button onClick={handleSave} disabled={isPending} className="h-11 px-8 text-foreground border-0 font-medium rounded-xl hover:opacity-90" style={{ background: brand.primaryColor }}>
                        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Synchronizing Engine...</> : <><Check className="h-4 w-4 mr-2" /> Save Global Trajectory</>}
                    </Button>
                </div>
            </motion.div>
        </PortalShell>
    )
}
