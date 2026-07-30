'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getAttendancePreCheck, markQrAttendance } from '@/actions/db/attendance'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Check, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Cardio', 'Mobility', 'Full Body', 'Other']

export default function CheckinPage({ params }) {
    const unwrappedParams = use(params)
    const gymCode = unwrappedParams.gymCode

    const router = useRouter()
    const { user, loading } = useAuth()
    const [status, setStatus] = useState('verifying') // verifying | confirm_workout | saving | success | error
    const [errorMsg, setErrorMsg] = useState('')

    const [plannedWorkout, setPlannedWorkout] = useState([])
    const [actualWorkout, setActualWorkout] = useState([])
    const [noFixedSchedule, setNoFixedSchedule] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/login?callback=/checkin/${gymCode}`)
            return;
        }

        const preCheck = async () => {
            const res = await getAttendancePreCheck(gymCode)
            if (res.error) {
                if (res.requireLogin) router.replace(`/login?callback=/checkin/${gymCode}`)
                else {
                    setErrorMsg(res.error)
                    setStatus('error')
                }
            } else if (res.message === 'Already checked in') {
                setStatus('success')
            } else {
                const plan = res.plannedWorkout || []
                setPlannedWorkout(plan)
                setActualWorkout(plan)
                setNoFixedSchedule(res.noFixedSchedule)
                if (res.noFixedSchedule || plan.length === 0) setIsEditing(true)
                setStatus('confirm_workout')
            }
        }
        preCheck()
    }, [user, loading, gymCode, router])

    const confirmCheckin = async () => {
        setStatus('saving')
        const res = await markQrAttendance(gymCode, actualWorkout, plannedWorkout)
        if (res.error) {
            setErrorMsg(res.error)
            setStatus('error')
        } else {
            setStatus('success')
        }
    }

    const toggleMuscle = (m) => {
        if (actualWorkout.includes(m)) setActualWorkout(actualWorkout.filter(x => x !== m))
        else setActualWorkout([...actualWorkout, m])
    }

    if (status === 'verifying' || status === 'saving' || loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-5" />
                <p className="text-foreground/50 text-sm font-medium tracking-wide">
                    {status === 'saving' ? 'Recording Attendance...' : 'Securely verifying QR Code...'}
                </p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
                <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/30">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3">Verification Failed</h1>
                <p className="text-foreground/60 mb-10 max-w-sm text-sm leading-relaxed">{errorMsg}</p>
                <Button onClick={() => router.push('/portal')} variant="outline" className="w-full max-w-[200px] h-12 bg-white/5 border border-foreground/10 text-foreground rounded-xl">
                    Back to Portal
                </Button>
            </div>
        )
    }

    if (status === 'confirm_workout') {
        const firstName = user?.name ? user.name.split(' ')[0] : 'Member'
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex-1 flex flex-col pt-10 max-w-sm mx-auto w-full">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">👋 Welcome, {firstName}!</h1>
                        <p className="text-foreground/50 text-sm">Let's confirm your session today.</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-8 space-y-6">
                        {!isEditing && (
                            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 glass">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Planned Workout</div>
                                </div>
                                <div className="font-display font-medium text-2xl mb-6">
                                    {plannedWorkout.length > 0 ? plannedWorkout.join(' + ') : 'Rest Day'}
                                </div>

                                <div className="space-y-3">
                                    <Button onClick={confirmCheckin} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                        <CheckCircle2 className="h-5 w-5 mr-2" /> That's my plan today
                                    </Button>
                                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full h-12 bg-white/5 border border-foreground/10 text-foreground rounded-xl">
                                        <Edit3 className="h-4 w-4 mr-2" /> Change Today's Workout
                                    </Button>
                                </div>
                            </div>
                        )}

                        {isEditing && (
                            <div className="animate-in slide-in-from-bottom-4 duration-300">
                                <h3 className="font-display text-xl font-bold mb-4">What are you training today?</h3>
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {MUSCLES.map(muscle => {
                                        const isSelected = actualWorkout.includes(muscle);
                                        return (
                                            <button key={muscle} onClick={() => toggleMuscle(muscle)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-transparent border-foreground/10 text-foreground/60 hover:bg-foreground/[0.05]'}`}>
                                                {isSelected && <Check className="h-4 w-4" />}
                                                {muscle}
                                            </button>
                                        )
                                    })}
                                </div>
                                <Button disabled={actualWorkout.length === 0} onClick={confirmCheckin} className="w-full h-14 bg-white text-black hover:bg-white/90 text-[15px] font-bold rounded-2xl shadow-xl shadow-white/5">
                                    Confirm & Enter <ArrowRight className="h-5 w-5 ml-2" />
                                </Button>
                                {(!noFixedSchedule && plannedWorkout.length > 0) && (
                                    <button onClick={() => { setActualWorkout(plannedWorkout); setIsEditing(false) }} className="w-full py-4 text-sm text-foreground/40 hover:text-foreground/70 transition mt-2">
                                        Oops, revert to my plan
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        )
    }

    const firstName = user?.name ? user.name.split(' ')[0] : 'Member'

    return (
        <div className="min-h-screen bg-[#050505] text-foreground flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">

                <div className="text-center mb-10">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">👋 Welcome, {firstName}!</h1>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Attendance Recorded
                        </div>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="w-full space-y-3">
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 glass">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs uppercase tracking-widest text-foreground/40">Today</div>
                            <div className="text-xs text-foreground/40">Est. 95 Min</div>
                        </div>
                        <div className="font-medium text-lg">{actualWorkout.length > 0 ? actualWorkout.join(' + ') : 'Rest Day'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Gym Crowd</div>
                            <div className="font-medium text-orange-400">Medium</div>
                        </div>
                        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Zone Alert</div>
                            <div className="font-medium text-emerald-400">Optimal</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 mt-2">
                        <div className="text-xs uppercase tracking-widest text-blue-400/60 mb-1 font-bold">Trainer Note</div>
                        <div className="text-sm font-medium text-blue-100/90 leading-relaxed italic">
                            "Let's crush today's plan! Stay hydrated. 💪"
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10">
                    <Button onClick={() => router.push('/portal')} className="w-full h-14 bg-white text-black hover:bg-white/90 text-[15px] font-bold rounded-2xl shadow-xl shadow-white/5">
                        Enter Dashboard <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                </motion.div>
            </div>
        </div>
    )
}
