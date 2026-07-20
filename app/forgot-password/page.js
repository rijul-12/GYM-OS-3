'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, Loader2, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { resetPasswordAction } from '@/actions/auth'

export default function ForgotPassword() {
    const { brand } = useBrand()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)
        try {
            await resetPasswordAction(email)
            setSuccess(true)
        } catch (err) {
            console.error(err)
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

                                <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
                                <p className="text-sm text-foreground/50 mb-6">Enter the email associated with your account, and we'll securely dispatch a reset link.</p>

                                <form onSubmit={submit} className="space-y-4 relative z-10">
                                    <div>
                                        <label className="text-xs text-foreground/60 mb-1.5 block">Email Address</label>
                                        <div className="relative">
                                            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="pl-10 h-11 bg-black/40 border-foreground/10 focus:border-foreground/20" />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button type="submit" disabled={loading || !email} style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground border-0 hover:opacity-90">
                                            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Dispatching Link…</> : 'Send Reset Link'}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            <div className="mt-6 text-center">
                                <Link href="/login" className="inline-flex items-center text-sm text-foreground/50 hover:text-foreground transition">
                                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Sign In
                                </Link>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-10">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="h-16 w-16 rounded-full flex items-center justify-center mb-6" style={{ background: `${brand.primaryColor}22`, border: `2px solid ${brand.primaryColor}` }}>
                                <Check className="h-7 w-7" style={{ color: brand.primaryColor }} />
                            </motion.div>
                            <h2 className="font-display text-2xl font-bold mb-2">Check your inbox</h2>
                            <p className="text-sm text-foreground/50 mb-8 px-4">We've sent a secure reset link to <span className="text-foreground">{email}</span>. Click the link to securely redefine your password.</p>

                            <Link href="/login">
                                <Button variant="outline" className="border-foreground/10 bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06]">
                                    Return to Sign In
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
