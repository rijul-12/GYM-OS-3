'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { markQrAttendance } from '@/actions/db/attendance'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckinPage({ params }) {
    const unwrappedParams = use(params)
    const gymCode = unwrappedParams.gymCode

    const router = useRouter()
    const { user, loading } = useAuth()
    const [status, setStatus] = useState('verifying') // verifying | success | error
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/login?callback=/checkin/${gymCode}`)
            return;
        }

        // Execute the QR action
        const doCheckIn = async () => {
            const res = await markQrAttendance(gymCode)
            if (res.error) {
                if (res.requireLogin) router.replace(`/login?callback=/checkin/${gymCode}`)
                else {
                    setErrorMsg(res.error)
                    setStatus('error')
                }
            } else {
                setStatus('success')
            }
        }
        doCheckIn()
    }, [user, loading, gymCode, router])

    if (status === 'verifying' || loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-5" />
                <p className="text-foreground/50 text-sm font-medium tracking-wide">Securely verifying QR Code...</p>
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
                        <div className="font-medium text-lg">Chest + Triceps</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Gym Crowd</div>
                            <div className="font-medium text-orange-400">Medium</div>
                        </div>
                        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Chest Zone</div>
                            <div className="font-medium text-red-400">High Demand</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.03] p-5">
                        <div className="text-xs uppercase tracking-widest text-foreground/40 mb-1">Suggested Start</div>
                        <div className="font-medium text-foreground/90">Start with Triceps today</div>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 mt-2">
                        <div className="text-xs uppercase tracking-widest text-blue-400/60 mb-1 font-bold">Trainer Note</div>
                        <div className="text-sm font-medium text-blue-100/90 leading-relaxed italic">
                            "Increase Incline Press weight today. You got this! 💪"
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
