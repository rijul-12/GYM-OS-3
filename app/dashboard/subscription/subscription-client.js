'use client'

import { useState, useTransition } from 'react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { CheckCircle2, IndianRupee, Shield, Clock, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSubscriptionRequest, dispatchSubscriptionInstructions } from '@/actions/db/subscriptions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const PLANS = [
    { id: 'starter', name: 'Starter', price: 2999, features: ['Up to 500 Members', 'Basic Reports', 'Community Support', 'Web Access'] },
    { id: 'pro', name: 'Pro', price: 4999, features: ['Up to 2000 Members', 'Advanced Analytics', 'Priority Support', 'Mobile Access', 'Automated Attendance'] },
    { id: 'elite', name: 'Elite', price: 8999, features: ['Unlimited Members', 'Custom Branding', 'API Access', 'Dedicated Account Manager', 'Multi-location Sync'] }
]

export default function SubscriptionClient({ status, gymId }) {
    const { brand } = useBrand()
    const router = useRouter()
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [step, setStep] = useState('overview') // overview -> checkout -> pending
    const [isPending, startTransition] = useTransition()
    const [refCode, setRefCode] = useState('')

    const initiateUpgrade = async (planId) => {
        const plan = PLANS.find(p => p.id === planId)
        setSelectedPlan(plan)

        toast.promise(
            dispatchSubscriptionInstructions({ gymId, planName: plan.name, planPrice: plan.price }),
            {
                loading: 'Sending Payment Instructions...',
                success: 'Instructions sent to your email!',
                error: 'Could not send email, proceed via dashboard.'
            }
        )

        setStep('checkout')
    }

    const submitPayment = () => {
        if (!refCode) return toast.error('Please enter the UPI or Bank Reference Number')

        startTransition(async () => {
            await createSubscriptionRequest({
                gymId,
                plan: selectedPlan.name,
                amount: selectedPlan.price,
                referenceNumber: refCode,
                paymentProofUrl: 'manual_upload_blob'
            })
            // Quick local reload to fetch pending phase
            window.location.reload()
        })
    }

    if (status.status === 'Pending_Payment') {
        return (
            <DashShell title="Subscription" subtitle="Manage your GymOS plan and billing">
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
                    <div className="h-16 w-16 bg-blue-500/20 text-blue-500 flex items-center justify-center rounded-full mb-6">
                        <Clock className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold font-display">Payment Verification Pending</h2>
                    <p className="text-foreground/50 mt-3 mb-6">
                        We have received your upgrade request. Please allow up to 24 hours for our team to manually verify the transaction and activate your account.
                    </p>
                    <Button variant="outline" className="border-foreground/10 hover:bg-white/5 text-foreground" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                </div>
            </DashShell>
        )
    }

    if (step === 'checkout') {
        return (
            <DashShell title="Complete Payment" subtitle={`Upgrading to ${selectedPlan.name} Plan`}>
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mt-6">
                    {/* Invoice Summary */}
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="text-lg font-bold font-display mb-4">Invoice Summary</div>
                        <div className="flex justify-between items-center py-4 border-b border-foreground/5">
                            <div>
                                <div className="font-semibold text-foreground">{selectedPlan.name} Plan (Monthly)</div>
                                <div className="text-xs text-foreground/40 mt-1">Full access to GymOS</div>
                            </div>
                            <div className="font-bold">₹{selectedPlan.price.toLocaleString()}</div>
                        </div>
                        <div className="flex justify-between items-center py-4">
                            <div className="font-semibold text-foreground/50">Total Amount Payable</div>
                            <div className="text-xl font-bold font-display" style={{ color: brand.primaryColor }}>₹{selectedPlan.price.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="text-lg font-bold font-display mb-4">Manual Payment Instructions</div>
                        <p className="text-sm text-foreground/60 mb-6">GymOS currently utilizes manual verification. Please transfer the exact amount using UPI or Bank Transfer using the details below.</p>

                        <div className="bg-black/30 p-4 border border-foreground/5 rounded-xl text-sm space-y-3 mb-6">
                            <div className="flex justify-between items-center"><span className="text-foreground/50">UPI ID</span><span className="font-mono font-medium">rijul0027@oksbi</span></div>
                            <div className="flex justify-between items-center"><span className="text-foreground/50">Bank Account</span><span className="font-mono font-medium">10099887766</span></div>
                            <div className="flex justify-between items-center"><span className="text-foreground/50">IFSC Code</span><span className="font-mono font-medium">ICIC0001009</span></div>
                            <div className="flex justify-between items-center"><span className="text-foreground/50">Beneficiary</span><span className="font-mono font-medium">GymOS Tech PVT LTD</span></div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Transaction Reference Number</label>
                                <input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="e.g. UPI Ref / UTR" className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-3 text-sm outline-none placeholder:text-foreground/20 text-foreground" />
                            </div>

                            <Button disabled={isPending || !refCode} onClick={submitPayment} style={{ background: brand.primaryColor }} className="w-full text-foreground h-12 text-sm font-semibold border-0">
                                {isPending ? 'Submitting Request...' : 'I Have Completed Payment'}
                            </Button>
                            <Button variant="outline" className="w-full border-foreground/5 hover:bg-white/5 text-foreground/50 h-10" onClick={() => setStep('overview')}>Cancel Upgrade</Button>
                        </div>
                    </div>
                </div>
            </DashShell>
        )
    }

    return (
        <DashShell title="Subscription" subtitle="Manage your GymOS plan and billing">

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-48 w-48 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" style={{ background: brand.primaryColor }} />
                    <div className="relative">
                        <div className="text-sm font-medium text-foreground/50 mb-1">Current Active Plan</div>
                        <div className="text-3xl font-display font-bold flex items-center gap-3">
                            {status.plan} {status.isReadOnly && <span className="text-sm px-2 py-1 bg-red-500/20 text-red-500 rounded-md font-medium tracking-wide uppercase">Expired</span>}
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

                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                    <div className="text-sm font-medium text-foreground/50 mb-4">Quick Actions</div>
                    <div className="space-y-3">
                        <Button onClick={() => toast.info('Billing support is handled via the Super Admin platform.')} className="w-full bg-white text-black hover:bg-white/90">Contact Billing Support</Button>
                        <Button onClick={() => toast.error('No past invoices exist for this account.')} variant="outline" className="w-full border-foreground/10 text-foreground hover:bg-white/5">Download Last Invoice</Button>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <div className="text-xl font-display font-bold text-center mb-2">Upgrade your GymOS</div>
                <div className="text-center text-foreground/50 text-sm mb-8">Select a tier that scales with your facility's operational demands.</div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {PLANS.map(p => (
                        <div key={p.id} className="rounded-2xl border border-foreground/10 bg-black/40 p-6 relative flex flex-col pt-8">
                            {p.id === 'pro' && <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />}

                            <div className="text-2xl font-bold font-display">{p.name}</div>
                            <div className="mt-2 text-3xl font-bold" style={{ color: brand.primaryColor }}>₹{p.price.toLocaleString()}<span className="text-sm text-foreground/40 font-normal">/mo</span></div>

                            <div className="mt-6 flex-1 space-y-3">
                                {p.features.map(f => (
                                    <div key={f} className="flex items-center gap-3 text-sm text-foreground/70">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        {f}
                                    </div>
                                ))}
                            </div>

                            <Button onClick={() => initiateUpgrade(p.id)} className="w-full mt-8 bg-foreground/[0.06] hover:bg-white/10 border border-foreground/10 text-foreground font-medium">
                                Upgrade to {p.name}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

        </DashShell>
    )
}
