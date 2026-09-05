'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { markQrCheckout, getActiveCheckoutContext } from '@/actions/db/attendance'
import { motion } from 'framer-motion'
import { Loader2, LogOut, CheckCircle2, AlertTriangle, ArrowRight, Clock, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutPage({ params }) {
    const unwrappedParams = use(params)
    const gymCode = unwrappedParams.gymCode

    const router = useRouter()
    const { user, loading } = useAuth()

    const [status, setStatus] = useState('verifying')
    const [errorMsg, setErrorMsg] = useState('')
    const [context, setContext] = useState(null)
    const [durationStr, setDurationStr] = useState('')

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/login?callback=/checkout/${gymCode}`)
            return;
        }

        const fetchContext = async () => {
            const res = await getActiveCheckoutContext();
            if (res.error) {
                setErrorMsg(res.error)
                setStatus('error')
            } else {
                setContext(res.context)
                setStatus('confirm')
            }
        }
        fetchContext()
    }, [user, loading, gymCode, router])

    const handleCheckout = async () => {
        setStatus('saving')
        const startTimestamp = new Date(context.checkInTime).getTime()
        const endTimestamp = new Date().getTime()
        const diffMins = Math.max(1, Math.round((endTimestamp - startTimestamp) / 60000))
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        setDurationStr(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`)

        const res = await markQrCheckout(gymCode)
        if (res.error) {
            setErrorMsg(res.error)
            setStatus('error')
        } else {
            setStatus('success')
        }
    }

    if (status === 'verifying' || loading || status === 'saving') {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-5" />
                <p className="text-foreground/50 text-sm font-medium tracking-wide">
                    {status === 'saving' ? 'Completing Session...' : 'Verifying Active Session...'}
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
                <h1 className="font-display text-2xl font-bold mb-3">Check-Out Failed</h1>
                <p className="text-foreground/60 mb-10 max-w-sm text-sm leading-relaxed">{errorMsg}</p>
                <Button onClick={() => router.push('/portal')} variant="outline" className="w-full max-w-[200px] h-12 bg-white/5 border border-foreground/10 text-foreground rounded-xl">
                    Back to Portal
                </Button>
            </div>
        )
    }

    if (status === 'confirm' && context) {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">

                    <div className="h-16 w-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 ring-4 ring-black">
                        <LogOut className="h-7 w-7 text-foreground/70" />
                    </div>

                    <h1 className="font-display text-2xl font-bold tracking-tight mb-2 text-center w-full">Complete your workout?</h1>
                    <p className="text-foreground/50 mb-8 text-center text-sm w-full">Please confirm you are leaving the facility.</p>

                    <div className="w-full space-y-3 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Clock className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold mb-0.5">Check-in Time</div>
                                <div className="font-medium truncate text-sm">{new Date(context.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Dumbbell className="h-5 w-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold mb-0.5">Workout Intent</div>
                                <div className="font-medium truncate text-sm">{Array.isArray(context.actualWorkout) ? context.actualWorkout.join(', ') : context.actualWorkout}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <Button onClick={() => router.push('/portal')} variant="outline" className="w-full h-14 bg-transparent border-white/10 text-foreground hover:bg-white/5 rounded-xl font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={handleCheckout} className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-xl font-bold">
                            Complete
                        </Button>
                    </div>

                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] text-foreground flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Session Completed</h1>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3 px-6 mb-8 inline-flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium text-emerald-400">Duration: {durationStr}</span>
                </div>

                <p className="text-foreground/50 mb-10 w-full text-sm">Your workout log has been saved securely.</p>

                <Button onClick={() => router.push('/portal')} className="w-full h-14 bg-white text-black hover:bg-white/90 text-[15px] font-bold rounded-2xl shadow-xl shadow-white/5">
                    Return to Portal <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
            </div>
        </div>
    )
}
