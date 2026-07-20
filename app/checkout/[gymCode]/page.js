'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { markQrCheckout } from '@/actions/db/attendance'
import { motion } from 'framer-motion'
import { Loader2, LogOut, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutPage({ params }) {
    const unwrappedParams = use(params)
    const gymCode = unwrappedParams.gymCode

    const router = useRouter()
    const { user, loading } = useAuth()
    const [status, setStatus] = useState('verifying')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/login?callback=/checkout/${gymCode}`)
            return;
        }

        const doCheckOut = async () => {
            const res = await markQrCheckout(gymCode)
            if (res.error) {
                setErrorMsg(res.error)
                setStatus('error')
            } else {
                setStatus('success')
            }
        }
        doCheckOut()
    }, [user, loading, gymCode, router])

    if (status === 'verifying' || loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-5" />
                <p className="text-foreground/50 text-sm font-medium tracking-wide">Processing Exit QR...</p>
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

    return (
        <div className="min-h-screen bg-[#050505] text-foreground flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">

                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }} className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6 border border-purple-500/20 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                    <CheckCircle2 className="h-10 w-10 text-purple-400" />
                </motion.div>

                <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Check-Out Complete</h1>
                <p className="text-foreground/50 mt-2 mb-10">We hope you had a great workout!</p>

                <Button onClick={() => router.push('/portal')} className="w-full h-14 bg-white text-black hover:bg-white/90 text-[15px] font-bold rounded-2xl shadow-xl shadow-white/5">
                    View Workout Summary <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
            </div>
        </div>
    )
}
