'use client'
import { useState, useTransition } from 'react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'
import { Activity, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateMember } from '@/actions/db/members'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function ScheduleClient({ initialData }) {
    const { brand } = useBrand()
    const [isPending, startTransition] = useTransition()

    // Ensure we have a default object in case the member was created before Phase 13
    const defaultSchedule = { Monday: 'Chest', Tuesday: 'Back', Wednesday: 'Rest', Thursday: 'Legs', Friday: 'Shoulders & Arms', Saturday: 'Cardio', Sunday: 'Rest' }
    const [schedule, setSchedule] = useState(initialData.weeklySchedule || defaultSchedule)

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
                <div className="grid gap-4">
                    {Object.keys(schedule).map((day) => (
                        <div key={day} className="flex flex-col md:flex-row md:items-center gap-3">
                            <div className="md:w-32 font-medium text-sm text-foreground/80">{day}</div>
                            <input
                                value={schedule[day]}
                                onChange={(e) => setSchedule({ ...schedule, [day]: e.target.value })}
                                className="flex-1 bg-foreground/[0.03] border border-foreground/10 rounded-xl h-11 px-4 outline-none text-sm focus:border-foreground/30 transition"
                                placeholder={`Target muscle group for ${day}`}
                            />
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
