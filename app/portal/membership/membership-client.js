'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CreditCard, Calendar, Check, ChevronRight, Sparkles, Shield } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'

import { useState } from 'react'

// --- SYNTHETIC FALLBACKS START ---
const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
// --- SYNTHETIC FALLBACKS END ---

export default function MembershipClient({ plans, meProfile }) {
    const { brand } = useBrand()
    const [comingSoon, setComingSoon] = useState(false)

    const me = meProfile || { id: 'M-000', name: 'Member Profile', membership_type: 'Basic', created_at: new Date().toISOString() }

    // Ensure we have a plan even if DB is empty
    const currentPlanName = me.membership_type || 'Basic Pass';
    const defaultLocalPlan = (plans || []).find(p => p.name === currentPlanName) || (plans && plans[0]) || { name: currentPlanName, price: 0, features: ['Gym Access'] }

    // Derive generic dates for visual rendering (future: add true expiry tracking from Stripe)
    const joinedD = new Date(me.created_at || Date.now());
    const joinedStr = `${joinedD.toLocaleString('default', { month: 'short' })} ${joinedD.getFullYear()}`;
    const expiryD = new Date(joinedD.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default +1 Year visual
    const expiryStr = `${expiryD.toLocaleString('default', { month: 'short' })} ${expiryD.getFullYear()}`;

    const qrData = encodeURIComponent(JSON.stringify({ id: me.id, name: me.name, plan: currentPlanName, gym: brand.gymName, exp: expiryStr }))
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&bgcolor=0a0a0a&color=ffffff&data=${qrData}`

    const daysLeft = Math.ceil((expiryD - new Date()) / (1000 * 60 * 60 * 24))

    return (
        <PortalShell title="Membership">

            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
                <CreditCard className="h-3 w-3" /> Your pass
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Membership</h1>
            <p className="text-sm text-foreground/50 mt-1">Scan at the front desk. Renew anytime.</p>

            {/* QR Card */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 rounded-3xl overflow-hidden border border-foreground/10" style={{ background: `linear-gradient(135deg, ${brand.primaryColor} 0%, #0a0a0a 60%)` }}>
                <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 20% 20%, ${brand.accentColor}80, transparent 40%)` }} />
                <div className="relative p-6 md:p-8 grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-foreground/70">{brand.gymName || 'Gym'} · Member Pass</div>
                        <div className="font-display text-2xl md:text-3xl font-bold mt-2 leading-tight">{me.name}</div>
                        <div className="mt-1 text-sm text-foreground/80">ID · {(me.id || '').substring(0, 6).toUpperCase()}</div>
                        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <Sparkles className="h-3 w-3" /> {currentPlanName}
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <div className="text-foreground/50 uppercase text-[9px] tracking-widest">Joined</div>
                                <div className="text-foreground mt-0.5">{joinedStr}</div>
                            </div>
                            <div>
                                <div className="text-foreground/50 uppercase text-[9px] tracking-widest">Expires</div>
                                <div className="text-foreground mt-0.5">{expiryStr}</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex md:justify-end">
                        <div className="rounded-2xl p-3 bg-card shadow-2xl">
                            <img src={qrUrl} alt="QR" className="h-40 w-40 md:h-52 md:w-52 rounded-lg" />
                            <div className="text-[9px] uppercase tracking-widest text-foreground/40 mt-2 text-center">Scan to check in</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Renewal + expiry */}
            <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div className="rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="flex items-center gap-2 text-xs text-foreground/50"><Calendar className="h-3.5 w-3.5" /> RENEWAL</div>
                    <div className="font-display text-3xl font-bold mt-2">{expiryStr}</div>
                    <div className="text-xs text-foreground/50 mt-1">{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</div>
                    <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(5, Math.min(100, (daysLeft / 365) * 100))}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: brand.primaryColor }} />
                    </div>
                </div>
                <div className="rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="flex items-center gap-2 text-xs text-foreground/50"><Shield className="h-3.5 w-3.5" /> AUTO RENEW</div>
                    <div className="font-display text-3xl font-bold mt-2">Enabled</div>
                    <div className="text-xs text-foreground/50 mt-1">Charged to Visa ···· 4211</div>
                    <button onClick={() => setComingSoon(true)} className="mt-4 text-xs text-foreground/70 hover:text-foreground flex items-center gap-1 opacity-50 cursor-not-allowed">Manage billing <ChevronRight className="h-3 w-3" /></button>
                </div>
            </div>

            {/* Plan details */}
            <div className="mt-4 rounded-3xl border p-6" style={{ borderColor: `${brand.primaryColor}30`, background: `linear-gradient(135deg, ${brand.primaryColor}08, transparent)` }}>
                <div className="flex items-start justify-between">
                    <div className="w-full pr-4">
                        <div className="text-[10px] uppercase tracking-widest text-foreground/50">Your plan</div>
                        <div className="font-display text-2xl font-bold mt-1">{defaultLocalPlan.name}</div>

                        {(brand.memberFeeRecovery && brand.memberFeeAmount > 0) ? (
                            <div className="mt-3 text-sm text-foreground/70 bg-black/20 p-3 rounded-lg border border-foreground/5">
                                <div className="flex justify-between mb-1"><span>Gym Membership</span> <span>₹{defaultLocalPlan.price}</span></div>
                                <div className="flex justify-between mb-2"><span>Digital Service Fee</span> <span>₹{brand.memberFeeAmount}</span></div>
                                <div className="flex justify-between font-bold text-lg text-foreground border-t border-white/5 pt-2">
                                    <span>Total</span>
                                    <span>₹{(Number(defaultLocalPlan.price) || 0) + Number(brand.memberFeeAmount)}<span className="text-xs font-normal text-foreground/50 ml-1">/mo</span></span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="font-display text-3xl font-bold">₹{defaultLocalPlan.price}</span>
                                <span className="text-foreground/50 text-sm">/mo</span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setComingSoon(true)} className="h-9 px-4 rounded-lg text-xs font-medium text-foreground opacity-50 cursor-not-allowed shrink-0" style={{ background: brand.primaryColor }}>Upgrade</button>
                </div>
                <ul className="mt-5 grid sm:grid-cols-2 gap-2">
                    {(defaultLocalPlan.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: brand.primaryColor }} /> {f}
                        </li>
                    ))}
                </ul>
            </div>
        </PortalShell>
    )
}
