'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Loader2, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { auth } from '@/lib/firebase/client'
import { confirmPasswordReset } from 'firebase/auth'

function ResetContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { brand } = useBrand()

    const oobCode = searchParams.get('oobCode')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirm) {
            setError("Passwords do not match!")
            return
        }

        if (!oobCode) {
            setError("Invalid reset code. Please request a new link.")
            return
        }

        setLoading(true)
        try {
            if (password.length < 8) throw new Error('Password must be at least 8 characters.')
            if (!auth) throw new Error('Password reset is unavailable: sign-in is not configured for this deployment.')
            await confirmPasswordReset(auth, oobCode, password)
            setSuccess(true)
        } catch (err) {
            setError(err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code' ? 'This reset link has expired or was already used. Request a new one.' : err?.code === 'auth/weak-password' ? 'Please choose a stronger password (at least 8 characters).' : (err.message || 'The password could not be updated.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center"><Link href="/"><Logo size="lg" /></Link></div>

                <AnimatePresence mode="wait">
                    {!success ? (
                        <motion.div key="form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full blur-3xl opacity-20 transition" style={{ background: brand.primaryColor }} />

                                <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Create New Password</h1>
                                <p className="text-sm text-foreground/50 mb-6">Your identity has been verified. Please enter your secure new password below.</p>

                                <form onSubmit={submit} className="space-y-4 relative z-10">
                                    <div>
                                        <label className="text-xs text-foreground/60 mb-1.5 block">New Password</label>
                                        <div className="relative">
                                            <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                                            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="pl-10 h-11 bg-black/40 border-foreground/10" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-foreground/60 mb-1.5 block">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                                            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="pl-10 h-11 bg-black/40 border-foreground/10" />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs px-3 py-2">
                                            {error}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Button type="submit" disabled={loading} style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground border-0 hover:opacity-90">
                                            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Reset Password'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-10">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="h-16 w-16 rounded-full flex items-center justify-center mb-6" style={{ background: `${brand.primaryColor}22`, border: `2px solid ${brand.primaryColor}` }}>
                                <Check className="h-7 w-7" style={{ color: brand.primaryColor }} />
                            </motion.div>
                            <h2 className="font-display text-2xl font-bold mb-2">Password Successfully Reset</h2>
                            <p className="text-sm text-foreground/50 mb-8 px-4">Your account credentials have been securely updated. You can now access your workspace.</p>

                            <Link href="/login" className="w-full">
                                <Button style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground hover:opacity-90">
                                    Proceed to Login <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    )
}


export default function ResetPassword() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ResetContent />
        </Suspense>
    )
}
