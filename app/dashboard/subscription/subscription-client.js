'use client'

import { useState, useTransition } from 'react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { CheckCircle2, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Script from 'next/script'
import { createRazorpayOrder, verifyPaymentSignature } from '@/actions/payments'

// Removed Fixed Strategy Framework

export default function SubscriptionClient({ status, gymId, costData }) {
    const { brand } = useBrand()
    const router = useRouter()
    const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'annual'
    const [isPending, startTransition] = useTransition()

    // Determine if this is the first payment converting from Trial
    const isFirstPayment = status.currentPhase === 'Trial'

    const handleCheckout = async (basePlanId) => {
        const planKey = `${basePlanId}-${billingCycle}`

        startTransition(async () => {
            const toastId = toast.loading('Initializing Secure Gateway...')
            // 1. Create Order Server-Side
            const orderRes = await createRazorpayOrder(planKey, gymId, isFirstPayment)

            if (orderRes.error || !orderRes.orderId) {
                toast.error(orderRes.error || 'Failed to initialize payment gateway', { id: toastId })
                return
            }

            toast.dismiss(toastId)

            // 2. Open Razorpay Custom Overlay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderRes.amountInPaise,
                currency: orderRes.currency,
                name: brand.gymName || "BGM",
                description: `Subscription: ${planKey.toUpperCase()}`,
                order_id: orderRes.orderId,
                handler: async function (response) {
                    toast.loading('Verifying secure transaction...', { id: 'payment_verify' })

                    // 3. Frontend Fallback Verification
                    const verifyRes = await verifyPaymentSignature(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        gymId,
                        planKey
                    )

                    if (verifyRes.success) {
                        toast.success('Payment verified successfully! Welcome aboard.', { id: 'payment_verify', duration: 4000 })
                        router.refresh()
                    } else {
                        toast.error(verifyRes.error || 'Signature verification failed', { id: 'payment_verify' })
                    }
                },
                prefill: {
                    name: status.ownerName || "Gym Owner",
                    email: status.ownerEmail || ""
                },
                theme: {
                    color: brand.primaryColor || "#ef4444"
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error("Payment Failed:", response.error)
                toast.error(`Payment Failed: ${response.error.description}`)
            });

            rzp.open();
        })
    }

    return (
        <DashShell title="Subscription" subtitle="Manage your BGM plan and billing">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-48 w-48 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" style={{ background: brand.primaryColor }} />
                    <div className="relative">
                        <div className="text-sm font-medium text-foreground/50 mb-1">{status.currentPhase === 'Trial' ? 'Current Status' : 'Current Active Plan'}</div>
                        <div className="text-3xl font-display font-bold flex items-center gap-3 capitalize">
                            {status.currentPhase === 'Trial' ? 'BGM FREE TRIAL' : (status.plan || 'Development Mode')} {status.isReadOnly && <span className="text-sm px-2 py-1 bg-red-500/20 text-red-500 rounded-md font-medium tracking-wide uppercase">Expired</span>}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6">
                            {status.currentPhase === 'Trial' && !status.isReadOnly ? (
                                <div className={`p-4 rounded-xl border w-full flex justify-between items-center ${status.daysRemaining < 7 ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' : 'bg-foreground/[0.03] border-foreground/5'}`}>
                                    <div>
                                        <div className="font-bold text-lg">{status.daysRemaining} days remaining</div>
                                        <div className="text-sm opacity-80 mt-0.5">Trial ends: {new Date(status.trialEndDate).toLocaleDateString()}</div>
                                    </div>
                                    {status.daysRemaining < 7 && <Clock className="h-6 w-6 text-orange-400 opacity-50" />}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <div className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Status Phase</div>
                                        <div className="font-medium">{status.currentPhase}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Days Remaining</div>
                                        <div className="font-medium">{status.daysRemaining} days</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-foreground/40 uppercase tracking-widest mb-1">Renewal Date</div>
                                        <div className="font-medium">{new Date(status.subscriptionExpiryDate || status.trialEndDate).toLocaleDateString()}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 flex flex-col">
                    <div className="text-sm font-medium text-foreground/50 mb-4">Billing Information</div>
                    {isFirstPayment && (
                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl mb-4 border border-blue-500/20">
                            <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-200">A one-time Registration Fee of <strong className="text-blue-100">₹2,999</strong> will be applied to your primary invoice today automatically.</div>
                        </div>
                    )}
                    <div className="space-y-3 mt-auto">
                        <Button variant="outline" className="w-full border-foreground/10 text-foreground hover:bg-white/5">Download Last Invoice</Button>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <div className="text-xl font-display font-bold text-center mb-2">Platform & Billing</div>
                <div className="text-center text-foreground/50 text-sm mb-6">BGM uses a transparent, usage-based pricing model that scales with your business automatically.</div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* Calculation Card */}
                    <div className="rounded-2xl border border-foreground/10 bg-black/40 p-6">
                        <div className="text-lg font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Usage Calculation</div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-foreground/70">Base Platform Fee</span>
                                <span className="font-medium">₹{costData.baseFee.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm border-b border-foreground/10 pb-4">
                                <span className="text-foreground/70 flex flex-col">
                                    <span>Active Member Usage</span>
                                    <span className="text-xs opacity-60">{costData.activePaidMembers} members × ₹{costData.rate}</span>
                                </span>
                                <span className="font-medium">₹{costData.usageCost.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center bg-foreground/5 p-3 rounded-lg">
                                <span className="font-bold">Estimated Monthly Cost</span>
                                <span className="font-bold text-xl" style={{ color: brand.primaryColor }}>₹{costData.totalCost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Features & Checkout */}
                    <div className="rounded-2xl border border-foreground/10 bg-black/40 p-6 flex flex-col">
                        <div className="text-lg font-bold flex items-center justify-between mb-2">
                            BGM Core <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">No Tier Limits</span>
                        </div>
                        <ul className="space-y-2 mt-4 text-sm text-foreground/70 mb-8 flex-1">
                            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40" /> Unlimited Members (pay as you grow)</li>
                            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40" /> Full Platform Access</li>
                            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40" /> Advanced AI Analytics</li>
                            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40" /> Automated Attendance</li>
                        </ul>

                        <Button disabled={isPending} onClick={() => handleCheckout('usage-v1')} className="w-full mt-auto font-medium" style={{ background: brand.primaryColor, color: '#fff' }}>
                            {status.currentPhase === 'Trial' ? 'Activate Platform' : 'Renew Subscription'}
                        </Button>
                    </div>
                </div>
            </div>

        </DashShell>
    )
}
