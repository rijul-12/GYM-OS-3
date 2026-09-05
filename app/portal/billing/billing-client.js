'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Smartphone, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Copy } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useBrand } from '@/components/brand-provider'
import { createMemberPaymentOrder, verifyMemberPaymentSignature, submitDirectUpiPayment } from '@/actions/payments'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

export default function BillingClient({ member, gymSettings, user }) {
    const { brand } = useBrand()
    const amount = member?.outstandingAmount || 0
    const planName = member?.plan || 'Membership Dues'

    const [isProcessing, setIsProcessing] = useState(false)
    const [upiMode, setUpiMode] = useState(false)
    const [successPayload, setSuccessPayload] = useState(null)

    const handleRazorpay = async () => {
        setIsProcessing(true)
        const loaded = await loadRazorpayScript()
        if (!loaded) {
            toast.error("Failed to load generic payment gateway.")
            setIsProcessing(false)
            return
        }

        try {
            const res = await createMemberPaymentOrder(member.id, user.gymCode, amount)
            if (res.error) {
                toast.error(res.error)
                setIsProcessing(false)
                return
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: res.amountInPaise,
                currency: res.currency,
                name: brand.gymName || "BGM Network",
                description: `Payment for ${planName}`,
                order_id: res.orderId,
                prefill: {
                    name: member.name,
                    email: member.email || 'customer@gymos.app',
                    contact: member.phone || '',
                },
                theme: { color: brand.primaryColor || '#ef4444' },
                handler: async function (response) {
                    toast.loading("Verifying your payment securely...")
                    const verifyRes = await verifyMemberPaymentSignature(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        user.gymCode,
                        member.id
                    )
                    toast.dismiss()
                    if (verifyRes.success) {
                        toast.success("Payment Received Successfully!")
                        setSuccessPayload({ type: 'RAZORPAY', id: response.razorpay_payment_id })
                    } else {
                        toast.error(verifyRes.error || "Payment verification failed globally.")
                    }
                }
            }

            const rzpClient = new window.Razorpay(options)
            rzpClient.on('payment.failed', function (r) {
                toast.error(`Payment Failed: ${r.error.description}`)
            })
            rzpClient.open()
        } catch (e) {
            toast.error("Transaction bridge collapsed unexpectedly.")
        }
        setIsProcessing(false)
    }

    const handleUpiSubmit = async () => {
        setIsProcessing(true)
        const res = await submitDirectUpiPayment(member.id, user.gymCode, amount)
        if (res.error) {
            toast.error(res.error)
        } else {
            setSuccessPayload({ type: 'UPI', id: 'PENDING_APPROVAL' })
        }
        setIsProcessing(false)
    }

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard!")
    }

    return (
        <PortalShell
            title="Billing & Dues"
            subtitle="Securely manage your active gym payments"
            active="billing"
        >
            <div className="max-w-lg mx-auto pb-20 animate-in slide-in-from-bottom-4 duration-500">
                {successPayload ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-4">
                        <div className="h-20 w-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/40">
                            {successPayload.type === 'UPI' ? <Smartphone className="h-10 w-10" /> : <CheckCircle2 className="h-10 w-10" />}
                        </div>
                        <div>
                            <h2 className="font-display text-2xl font-bold mb-1">
                                {successPayload.type === 'UPI' ? 'Payment Under Verification' : 'Payment Successful'}
                            </h2>
                            <p className="text-foreground/60 text-sm">
                                {successPayload.type === 'UPI' ? 'Your gym owner has been notified and will verify the transfer shortly.' : `Thank you! Your due balance of ₹${amount} is cleared.`}
                            </p>
                        </div>
                        <Button onClick={() => window.location.href = '/portal'} className="mt-8 bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            Return to Dashboard
                        </Button>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {/* Status Guard */}
                        <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3">
                                {amount > 0 ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold tracking-widest uppercase"><AlertTriangle className="h-3 w-3" /> Due Pending</div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-widest uppercase"><CheckCircle2 className="h-3 w-3" /> Fully Paid</div>
                                )}
                            </div>

                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Outstanding Balance</h3>
                            <div className="font-display text-5xl font-bold flex items-baseline gap-1">
                                <span className="text-xl text-foreground/50">₹</span>{amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-foreground/60 mt-3 pt-3 border-t border-foreground/10">Plan: <span className="text-foreground font-medium">{planName}</span></div>
                        </div>

                        {amount > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold px-1">Select Payment Gateway</h4>

                                {/* Checkout Block */}
                                {(!gymSettings.upi_enabled && !gymSettings.razorpay_enabled) && (
                                    <div className="text-sm text-foreground/50 p-4 border border-foreground/10 rounded-2xl bg-foreground/5 text-center">
                                        Your Gym Owner has not enabled digital payments. Please pay at the front desk.
                                    </div>
                                )}

                                {gymSettings.upi_enabled && (
                                    <motion.div className="rounded-2xl border border-foreground/10 bg-black/40 overflow-hidden">
                                        <div
                                            onClick={() => setUpiMode(!upiMode)}
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                                    <Smartphone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">Direct UPI Transfer</div>
                                                    <div className="text-[11px] text-foreground/50">Pay via GPay, PhonePe, Paytm</div>
                                                </div>
                                            </div>
                                            <ArrowRight className={`h-4 w-4 text-foreground/30 transition-transform ${upiMode ? 'rotate-90' : ''}`} />
                                        </div>

                                        <AnimatePresence>
                                            {upiMode && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-foreground/10 bg-foreground/[0.02]">
                                                    <div className="p-5 space-y-4">
                                                        <div className="text-sm text-foreground/70">
                                                            1. Copy your gym's official UPI ID below.<br />
                                                            2. Transfer exactly <b>₹{amount.toLocaleString()}</b> using your preferred UPI app.<br />
                                                            3. Click "I have paid" immediately after.
                                                        </div>
                                                        <div className="flex">
                                                            <Input readOnly value={gymSettings.upi_id || 'Not Provided'} className="rounded-r-none border-r-0 bg-black border-foreground/20 text-foreground selection:bg-orange-500/30" />
                                                            <Button onClick={() => handleCopy(gymSettings.upi_id)} className="rounded-l-none bg-foreground/10 hover:bg-foreground/20 text-foreground border border-l-0 border-foreground/20"><Copy className="h-4 w-4" /></Button>
                                                        </div>
                                                        <Button disabled={isProcessing} onClick={handleUpiSubmit} className="w-full bg-orange-500 text-black hover:bg-orange-600 font-bold h-11 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                                                            {isProcessing ? 'Submitting...' : 'I Have Paid This Amount'}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {gymSettings.razorpay_enabled && (
                                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] overflow-hidden p-4 flex flex-col items-center justify-center space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-500 justify-center w-full">
                                            <ShieldCheck className="h-5 w-5" />
                                            <span className="font-bold text-sm tracking-wide">SECURE CARD / NET BANKING</span>
                                        </div>
                                        <Button disabled={isProcessing} onClick={handleRazorpay} className="w-full bg-emerald-500 text-black hover:bg-emerald-600 font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                                            {isProcessing ? 'Connecting gateway...' : 'Pay Instant Securely'}
                                        </Button>
                                        <div className="text-[10px] text-foreground/40 font-medium uppercase tracking-widest flex gap-4">
                                            <span>Cards</span><span>UPI</span><span>NetBanking</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PortalShell>
    )
}
