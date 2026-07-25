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

const PLANS = [
    { id: 'starter', name: 'Starter', price: 1999, annualPrice: 17999, limit: 75, features: ['Up to 75 Members', 'Basic Reports', 'Community Support', 'Web Access'] },
    { id: 'pro', name: 'Pro', price: 3999, annualPrice: 35999, limit: 130, features: ['Up to 130 Members', 'Advanced Analytics', 'Priority Support', 'Mobile Access', 'Automated Attendance'] },
    { id: 'elite', name: 'Elite', price: 5999, annualPrice: 53999, limit: 999999, features: ['Unlimited Members', 'Custom Branding', 'API Access', 'Dedicated Account Manager', 'Multi-location Sync'] }
]

export default function SubscriptionClient({ status, gymId }) {
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
                name: brand.gymName || "GymOS",
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
        <DashShell title="Subscription" subtitle="Manage your GymOS plan and billing">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-48 w-48 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" style={{ background: brand.primaryColor }} />
                    <div className="relative">
                        <div className="text-sm font-medium text-foreground/50 mb-1">Current Active Plan</div>
                        <div className="text-3xl font-display font-bold flex items-center gap-3 capitalize">
                            {status.plan || 'Development Mode'} {status.isReadOnly && <span className="text-sm px-2 py-1 bg-red-500/20 text-red-500 rounded-md font-medium tracking-wide uppercase">Expired</span>}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6">
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
                <div className="text-xl font-display font-bold text-center mb-2">Upgrade your GymOS</div>
                <div className="text-center text-foreground/50 text-sm mb-6">Select a tier that scales with your facility's operational demands.</div>

                <div className="flex justify-center mb-8">
                    <div className="bg-foreground/5 p-1 rounded-xl inline-flex text-sm font-medium">
                        <button onClick={() => setBillingCycle('monthly')} className={`px-6 py-2 rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-foreground text-background shadow-md' : 'text-foreground/60 hover:text-foreground'}`}>Monthly Billing</button>
                        <button onClick={() => setBillingCycle('annual')} className={`px-6 py-2 rounded-lg transition-all ${billingCycle === 'annual' ? 'bg-foreground text-background shadow-md' : 'text-foreground/60 hover:text-foreground'}`}>Annual Billing <span className="ml-1 text-emerald-500 font-bold">-25%</span></button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {PLANS.map(p => {
                        const activePrice = billingCycle === 'annual' ? p.annualPrice : p.price;
                        return (
                            <div key={p.id} className="rounded-2xl border border-foreground/10 bg-black/40 p-6 relative flex flex-col pt-8">
                                {p.id === 'pro' && <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />}

                                <div className="text-2xl font-bold font-display">{p.name}</div>
                                <div className="mt-2 text-3xl font-bold" style={{ color: brand.primaryColor }}>₹{activePrice.toLocaleString()}<span className="text-sm text-foreground/40 font-normal">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span></div>

                                <div className="mt-6 flex-1 space-y-3">
                                    {p.features.map(f => (
                                        <div key={f} className="flex items-center gap-3 text-sm text-foreground/70">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                <Button disabled={isPending} onClick={() => handleCheckout(p.id)} className="w-full mt-8 bg-foreground/[0.06] hover:bg-white/10 border border-foreground/10 text-foreground font-medium">
                                    Upgrade to {p.name}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

        </DashShell>
    )
}
