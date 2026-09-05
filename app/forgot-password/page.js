'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, ArrowRight, XCircle, CheckCircle2, ShieldCheck, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { resetPasswordAction } from '@/actions/auth'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle') // idle, loading, success, error
    const [msg, setMsg] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setStatus('loading')
        try {
            await resetPasswordAction(email)
            setStatus('success')
            setMsg('We sent a password reset link to your email.')
        } catch (err) {
            setStatus('error')
            setMsg(err.message || 'Failed to send reset email.')
        }
    }

    return (
        <div className="min-h-screen bg-black text-foreground selection:bg-foreground selection:text-black flex bg-[url('https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=2000')] bg-cover bg-center">

            <div className="absolute inset-0 bg-black/80 backdrop-blur-[6px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-transparent" />

            <div className="relative w-full max-w-md mx-auto my-auto p-4 flex flex-col justify-center">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[2rem] bg-black/60 shadow-2xl border border-white/5 backdrop-blur-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <ShieldCheck className="w-48 h-48" />
                    </div>

                    <div className="relative">
                        <Link href="/login" className="inline-flex items-center text-xs font-semibold text-white/50 hover:text-white transition group mb-8 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <ArrowLeft className="h-3.5 w-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Back to sign in
                        </Link>

                        <h1 className="text-3xl font-display font-medium tracking-tight mb-2">Reset password</h1>
                        <p className="text-white/50 text-sm mb-8 leading-relaxed">Enter the email associated with your BGM account to receive a secure password reset link.</p>

                        <AnimatePresence mode="wait">
                            {status === 'success' ? (
                                <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-2">Check your email</h3>
                                    <p className="text-sm text-white/50 leading-relaxed mb-6">{msg}</p>
                                    <Link href="/login">
                                        <Button className="w-full bg-white text-black hover:bg-neutral-200">Return to login</Button>
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    <Mail className="h-4 w-4 text-white/30" />
                                                </div>
                                                <Input required type="email" placeholder="owner@bgm.app" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white focus:ring-1 focus:ring-white rounded-xl transition-all" />
                                            </div>
                                        </div>
                                    </div>

                                    {status === 'error' && (
                                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <div className="text-xs text-red-400">{msg}</div>
                                        </div>
                                    )}

                                    <Button type="submit" disabled={status === 'loading'} className="w-full h-12 rounded-xl bg-white text-black hover:bg-neutral-200 font-medium tracking-wide">
                                        {status === 'loading' ? 'Sending link...' : 'Send reset link'}
                                    </Button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div className="mt-8 text-center flex items-center justify-center gap-2 text-white/40 text-xs">
                    <Dumbbell className="h-3 w-3" /> Powered by BGM
                </div>
            </div>

        </div>
    )
}
