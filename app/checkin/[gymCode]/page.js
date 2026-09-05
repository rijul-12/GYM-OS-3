'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getAttendancePreCheck, markQrAttendance } from '@/actions/db/attendance'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Check, Edit3, Clock } from 'lucide-react'
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
    const [checkInTime, setCheckInTime] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (loading) return; // Wait for Firebase Auth
        if (!user) {
            router.replace(`/login?callback=/checkin/${gymCode}`)
            return;
        }

        let isMounted = true;
        const preCheck = async () => {
            try {
                const res = await getAttendancePreCheck(gymCode)
                if (!isMounted) return;

                if (res.error) {
                    if (res.requireLogin) router.replace(`/login?callback=/checkin/${gymCode}`)
                    else {
                        setErrorMsg(res.error)
                        setStatus('error')
                    }
                } else if (res.message === 'Already checked in') {
                    // Fast bypass if already legitimately inside
                    setCheckInTime(new Date())
                    setStatus('success')
                } else {
                    const plan = res.plannedWorkout || []
                    setPlannedWorkout(plan)
                    setActualWorkout(plan)
                    setNoFixedSchedule(res.noFixedSchedule)

                    if (res.noFixedSchedule === true || plan.length === 0) {
                        setIsEditing(true)
                    } else {
                        setIsEditing(false)
                    }
                    setStatus('confirm_workout')
                }
            } catch (err) {
                if (isMounted) {
                    setErrorMsg('Connection error verifying QR code. Please try again.')
                    setStatus('error')
                }
            }
        }

        preCheck()

        return () => { isMounted = false }
    }, [user, loading, gymCode, router])

    const confirmCheckin = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (isSubmitting) return; // Prevent double taps inherently
        setIsSubmitting(true)
        setStatus('saving')

        try {
            const res = await markQrAttendance(gymCode, actualWorkout, plannedWorkout)
            if (res.error) {
                setErrorMsg(res.error)
                setStatus('error')
            } else {
                setCheckInTime(new Date())
                setStatus('success')
            }
        } catch (e) {
            setErrorMsg('Network timeout. Please ensure you are connected and try again.')
            setStatus('error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleMuscle = (m, e) => {
        if (e && e.preventDefault) e.preventDefault()
        if (actualWorkout.includes(m)) setActualWorkout(actualWorkout.filter(x => x !== m))
        else setActualWorkout([...actualWorkout, m])
    }

    if (loading || status === 'verifying') {
        return (
            <div className="min-h-[100dvh] bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-300">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-5" />
                <p className="text-foreground/70 text-[15px] font-medium tracking-wide">
                    Loading your BGM check-in...
                </p>
            </div>
        )
    }

    if (status === 'saving') {
        return (
            <div className="min-h-[100dvh] bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-300">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-5" />
                <p className="text-foreground/70 text-[15px] font-medium tracking-wide">
                    Checking you in...
                </p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="min-h-[100dvh] bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 text-center pb-[env(safe-area-inset-bottom)] animate-in zoom-in-95 duration-300">
                <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/30">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3">Verification Failed</h1>
                <p className="text-foreground/60 mb-10 max-w-sm text-[15px] leading-relaxed">{errorMsg}</p>
                <div className="space-y-3 w-full max-w-xs mx-auto">
                    {errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connection') ? (
                        <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-[52px] bg-white/5 border border-foreground/10 text-foreground rounded-xl text-[16px]">
                            Try Again
                        </Button>
                    ) : (
                        <Button onClick={() => router.push('/portal')} variant="outline" className="w-full h-[52px] bg-white/5 border border-foreground/10 text-foreground rounded-xl text-[16px]">
                            Back to Portal
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    if (status === 'confirm_workout') {
        const firstName = user?.name ? user.name.split(' ')[0] : 'Member'

        return (
            <div className="min-h-[100dvh] bg-[#050505] text-foreground flex flex-col p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex-1 flex flex-col pt-6 md:pt-10 max-w-sm mx-auto w-full">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">👋 Welcome, {firstName}!</h1>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {!isEditing ? (
                            <motion.div key="planned" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="mt-8 space-y-6">
                                <p className="text-foreground/60 text-[15px]">Is this what you're training today?</p>

                                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 shadow-sm">
                                    <div className="text-xs uppercase tracking-widest text-foreground/40 font-bold mb-3">Today's Workout</div>
                                    <div className="font-display font-semibold text-2xl text-foreground">
                                        {plannedWorkout.length > 0 ? plannedWorkout.join(' + ') : 'Rest Day'}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button onClick={confirmCheckin} disabled={isSubmitting} className="w-full min-h-[56px] h-auto bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl text-[16px] touch-manipulation">
                                        Confirm Workout
                                    </Button>
                                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full min-h-[56px] h-auto bg-transparent border border-foreground/15 text-foreground rounded-2xl text-[16px] touch-manipulation">
                                        Change Workout
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="editing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="mt-6 flex flex-col flex-1 pb-4">
                                <h3 className="font-display text-2xl font-bold mb-5">
                                    {noFixedSchedule ? "Choose today's workout" : "What are you training today?"}
                                </h3>

                                <div className="flex flex-wrap gap-2.5 mb-10 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100dvh - 350px)' }}>
                                    {MUSCLES.map(muscle => {
                                        const isSelected = actualWorkout.includes(muscle);
                                        return (
                                            <button
                                                type="button"
                                                key={muscle}
                                                onClick={(e) => toggleMuscle(muscle, e)}
                                                className={`flex items-center gap-1.5 px-4 h-[44px] rounded-xl border text-[15px] font-medium transition-colors touch-manipulation active:scale-95 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black shadow-sm' : 'bg-foreground/[0.03] border-foreground/10 text-foreground/70 hover:bg-foreground/[0.08]'}`}>
                                                {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                                {muscle}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="mt-auto space-y-3">
                                    <Button type="button" disabled={isSubmitting || actualWorkout.length === 0} onClick={confirmCheckin} className="w-full min-h-[56px] h-auto bg-white text-black text-[16px] font-bold rounded-2xl shadow-xl shadow-white/5 active:scale-[0.98] transition-transform touch-manipulation">
                                        {isSubmitting ? 'Checking in...' : 'Check In'}
                                    </Button>
                                    {(!noFixedSchedule && plannedWorkout.length > 0) && (
                                        <button type="button" onClick={(e) => { e.preventDefault(); setActualWorkout(plannedWorkout); setIsEditing(false) }} className="w-full py-4 text-[15px] text-foreground/50 hover:text-foreground/90 transition-colors touch-manipulation">
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        )
    }

    const firstName = user?.name ? user.name.split(' ')[0] : 'Member'

    return (
        <div className="min-h-[100dvh] bg-[#050505] text-foreground flex flex-col p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in fade-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">

                <div className="text-center mb-10">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <h1 className="font-display text-[32px] font-bold tracking-tight mb-3">You're checked in!</h1>
                        <div className="text-[15px] text-foreground/60 mb-2">Have a great session, {firstName}.</div>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="w-full space-y-3">
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Today's Workout</div>
                            {checkInTime && (
                                <div className="text-[13px] text-foreground/50 font-medium flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 opacity-60" />
                                    {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                        <div className="font-medium text-xl leading-snug">{actualWorkout.length > 0 ? actualWorkout.join(' + ') : 'Rest Day'}</div>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 mt-2">
                        <div className="text-xs uppercase tracking-widest text-blue-400/70 mb-1.5 font-bold">Trainer Note</div>
                        <div className="text-[14px] font-medium text-blue-100/90 leading-relaxed italic">
                            "Let's crush today's plan! Stay hydrated. 💪"
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
                    <Button onClick={() => window.location.href = '/portal'} className="w-full min-h-[56px] h-auto bg-white text-black text-[16px] font-bold rounded-2xl shadow-xl shadow-white/5 active:scale-[0.98] touch-manipulation transition-transform">
                        Go to Portal <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                </motion.div>
            </div>
        </div>
    )
}
