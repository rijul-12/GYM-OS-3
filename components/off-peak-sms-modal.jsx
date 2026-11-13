'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Users, AlertTriangle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOffPeakEligibility, blastOffPeakSMS } from '@/actions/sms'
import { useBrand } from './brand-provider'
import { toast } from 'sonner'

export function OffPeakSMSModal({ open, onOpenChange }) {
    const { brand } = useBrand()
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [eligibility, setEligibility] = useState(null)
    const [errorMsg, setErrorMsg] = useState(null)

    useEffect(() => {
        if (open) {
            setLoading(true)
            setErrorMsg(null)
            getOffPeakEligibility().then(res => {
                if (res.error) {
                    setErrorMsg(res.error)
                } else {
                    setEligibility(res)
                }
                setLoading(false)
            }).catch(e => {
                setErrorMsg("Failed to connect.")
                setLoading(false)
            })
        }
    }, [open])

    const handleSend = async () => {
        setSending(true)
        setErrorMsg(null)
        try {
            const res = await blastOffPeakSMS()
            if (res.error) {
                setErrorMsg(res.error)
            } else {
                toast.success(`Twilio accepted ${res.acceptedCount} message${res.acceptedCount === 1 ? '' : 's'}${res.rejectedCount ? ` · ${res.rejectedCount} rejected` : ''}.`, { id: 'sms' })
                onOpenChange(false)
            }
        } catch (e) {
            setErrorMsg("Network error during dispatch.")
        }
        setSending(false)
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                    <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-foreground/10 rounded-2xl p-6 shadow-2xl">

                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-display font-bold">Off-Peak SMS Campaign</h2>
                            <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-foreground/[0.04] rounded-lg transition-colors"><X className="h-5 w-5 text-foreground/50" /></button>
                        </div>

                        {loading ? (
                            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" style={{ borderColor: `${brand.primaryColor}80`, borderTopColor: 'transparent' }} />
                                <div className="text-foreground/50 text-sm">Evaluating eligible audience...</div>
                            </div>
                        ) : errorMsg ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                    <AlertTriangle className="h-6 w-6 text-red-500" />
                                </div>
                                <div className="text-sm font-medium mb-1">Configuration Error</div>
                                <div className="text-foreground/50 text-xs px-4 whitespace-pre-line">{errorMsg}</div>
                            </div>
                        ) : eligibility?.eligibleCount === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                                    <Users className="h-6 w-6 text-orange-500" />
                                </div>
                                <div className="text-sm font-medium mb-1">No Eligible Members found</div>
                                <div className="text-foreground/50 text-xs px-4">All active members are either currently in the gym or missing a valid phone registry.</div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-foreground/[0.02] border border-foreground/5 rounded-xl p-4 flex gap-4 items-center">
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${brand.primaryColor}15` }}>
                                        <Users className="h-5 w-5" style={{ color: brand.primaryColor }} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-foreground/50 uppercase tracking-widest font-semibold mb-0.5">Audience</div>
                                        <div className="font-medium">{eligibility.eligibleCount} offline active members</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground/70">
                                        <MessageSquare className="h-4 w-4" /> Message Preview
                                    </div>
                                    <div className="bg-[#1f2937] text-white p-4 rounded-[1.25rem] rounded-tr-sm text-sm leading-relaxed shadow-inner">
                                        Hi {eligibility.sampleMemberName}, {eligibility.gymName} is quiet right now - a great time for your workout. - BGM
                                    </div>
                                    <div className="text-[10px] text-foreground/40 mt-2 text-right">Preview based on standard template</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <Button disabled={sending} onClick={() => onOpenChange(false)} variant="outline" className="w-full bg-transparent border-foreground/10 text-foreground">
                                        Cancel
                                    </Button>
                                    <Button disabled={sending} onClick={handleSend} className="w-full text-white border-0 font-semibold" style={{ background: brand.primaryColor }}>
                                        {sending ? 'Dispatching...' : 'Dispatch SMS'} <Send className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
