'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Check, XCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { auth } from '@/lib/firebase/client'
import { applyActionCode } from 'firebase/auth'

function VerifyContent() {
    const searchParams = useSearchParams()
    const oobCode = searchParams.get('oobCode')
    const { brand } = useBrand()

    const [status, setStatus] = useState('verifying') // verifying | success | error
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (!oobCode && process.env.NODE_ENV === 'production') {
            setStatus('error')
            setErrorMsg('Invalid or missing verification code. Please request a new link.')
            return
        }

        const verify = async () => {
            try {
                if (auth && oobCode) {
                    await applyActionCode(auth, oobCode)
                } else {
                    // local bypass delay
                    await new Promise(r => setTimeout(r, 1500))
                }
                setStatus('success')
            } catch (err) {
                setStatus('error')
                setErrorMsg(err.message || 'We could not securely verify this link. It may have expired.')
            }
        }

        verify()
    }, [oobCode])

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center"><Link href="/"><Logo size="lg" /></Link></div>

                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">

                    {status === 'verifying' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                            <Loader2 className="h-10 w-10 animate-spin mb-4" style={{ color: brand.primaryColor }} />
                            <h2 className="font-display text-2xl font-bold mb-2">Verifying Identity</h2>
                            <p className="text-sm text-foreground/50">Please wait while we establish a secure connection matching your email records...</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                            <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full blur-3xl opacity-20 transition" style={{ background: '#10b981' }} />
                            <div className="h-16 w-16 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10b981' }}>
                                <Check className="h-7 w-7 text-emerald-500" />
                            </div>
                            <h2 className="font-display text-2xl font-bold mb-2">Email Verified</h2>
                            <p className="text-sm text-foreground/50 mb-8 px-4">Your infrastructure access has been permanently secured. You are clear to proceed.</p>

                            <Link href="/login" className="w-full">
                                <Button style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground hover:opacity-90">
                                    Proceed to Login <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                            <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full blur-3xl opacity-20 transition" style={{ background: '#ef4444' }} />
                            <div className="h-16 w-16 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444' }}>
                                <XCircle className="h-7 w-7 text-red-500" />
                            </div>
                            <h2 className="font-display text-2xl font-bold mb-2">Verification Failed</h2>
                            <p className="text-sm text-foreground/50 mb-8 px-4">{errorMsg}</p>

                            <Link href="/login" className="w-full">
                                <Button variant="outline" className="w-full h-11 border-foreground/10 bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06]">
                                    Return to Safety
                                </Button>
                            </Link>
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    )
}

export default function VerifyEmail() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VerifyContent />
        </Suspense>
    )
}
