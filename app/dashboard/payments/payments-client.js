'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, CreditCard, Clock } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getPendingMemberTransactions, resolveUpiPayment } from '@/actions/db/member_payments'

export default function PaymentsClient({ user }) {
    const [transactions, setTransactions] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchPending = async () => {
        setIsLoading(true)
        try {
            const data = await getPendingMemberTransactions(user.gymCode)
            setTransactions(data)
        } catch (e) {
            toast.error("Failed to fetch pending transactions")
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchPending()
    }, [])

    const handleAction = async (txId, action) => {
        toast.loading(`Processing verification...`)
        const res = await resolveUpiPayment(txId, action)
        toast.dismiss()
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(action === 'PAID' ? "Payment Confirmed!" : "Payment Rejected")
            setTransactions(prev => prev.filter(t => t.id !== txId))
        }
    }

    return (
        <DashShell title="Manual Payment Verifications" subtitle="Approve incoming direct UPI transfers from your members">
            <div className="max-w-5xl mx-auto space-y-6">

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold font-display">Pending UPI Verifications</h2>
                        <p className="text-[13px] text-foreground/50 mt-1">Cross-reference your bank app to confirm these amounts.</p>
                    </div>
                    <Button variant="outline" onClick={fetchPending} disabled={isLoading} className="border-foreground/10 bg-foreground/[0.03]">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-2 overflow-hidden">
                    <div className="min-w-[700px] w-full">
                        <div className="grid grid-cols-6 gap-4 p-4 text-[10px] uppercase font-bold tracking-widest text-foreground/40 border-b border-foreground/5">
                            <div className="col-span-2">Member Details</div>
                            <div>Gateway</div>
                            <div>Amount Claimed</div>
                            <div>Date Submitted</div>
                            <div className="text-right">Admin Actions</div>
                        </div>

                        {transactions.length === 0 && !isLoading && (
                            <div className="text-center py-20">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500/40 mx-auto mb-4" />
                                <h3 className="font-semibold text-lg text-foreground/70">All clear!</h3>
                                <p className="text-sm text-foreground/40 mt-1">There are no pending UPI transfers waiting for your approval.</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {transactions.map(tx => (
                                <motion.div key={tx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-6 gap-4 items-center p-4 border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.02] transition-colors">
                                    <div className="col-span-2">
                                        <div className="font-semibold text-[15px]">{tx.memberName}</div>
                                        <div className="text-[11px] text-foreground/40 font-mono mt-0.5">TX: {tx.id}</div>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-[10px] uppercase tracking-widest font-bold">
                                            <AlertCircle className="h-3 w-3" /> {tx.method}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold font-display text-emerald-400">₹{tx.amount.toLocaleString()}</div>
                                    </div>
                                    <div className="text-xs text-foreground/60 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {new Date(tx.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" onClick={() => handleAction(tx.id, 'REJECTED')} variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-500 h-9">
                                            Reject
                                        </Button>
                                        <Button size="sm" onClick={() => handleAction(tx.id, 'PAID')} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-9">
                                            Verify & Clear
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </DashShell>
    )
}
