'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CreditCard, Calendar, Check, ChevronRight, Sparkles, Shield } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'

// --- SYNTHETIC FALLBACKS START ---
const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const WORKOUT_DIST = [{ name: 'Strength', value: 45, color: '#ef4444' }, { name: 'Cardio', value: 30, color: '#3b82f6' }]
const IMAGES = ['https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg']
const PLAN_DATA = [{ name: 'Basic', price: 9.99 }, { name: 'Pro', price: 19.99 }]
const ATTENDANCE_WEEKLY = [{ day: 'Mon', in: 42, out: 38 }, { day: 'Tue', in: 55, out: 51 }]
const TESTIMONIALS = [{ quote: "Great gym!", author: "User" }]
const FAQS = [{ q: "Hours?", a: "24/7" }]
const PLANS = [{ name: 'Premium', price: 19.99, features: ['24/7 Access'] }]
const MEMBER_INSIGHTS = [{ value: '5:30 AM', detail: 'Quiet tomorrow.' }]
const ASSIGNED_MEMBERS = [{ id: 't1', name: 'James Wilson', photo: 'https://i.pravatar.cc/150?u=j', checkedIn: true, stage: 'Lifting', todayWorkout: 'Hypertrophy Block A', attendance: 85, progress: 40, status: 'Active' }]
const PROGRESS = { default: [{ w: 1, bench: 135, squat: 185 }] }
const CURRENT_TRAINER = { name: "Lead Trainer", role: "Head of PT", rating: 4.9, activeClients: 12, thisMonth: 45, target: 50, joined: "2021", bio: "Expert." }
const WEEKLY_PLANS = {}
const WORKOUT_TYPES = ['Hypertrophy', 'Strength', 'Endurance', 'Mobility']
const ATTENDANCE_CALENDAR = []
const WORKOUT_HISTORY = []
const ME = { id: '#102', name: 'James Wilson', plan: 'Premium', joined: 'Jan 2024', expiry: 'Jan 2025' }
const PERSONAL = { dob: "1994-05-15", gender: "Male", phone: "555-0101", emergency: "Jane Wilson 555-0102" }
const SCHEDULE = [{ day: 'Mon', type: 'Chest & Triceps', cals: 450 }]
const NOTIFICATION_PREFS = { push: true, sms: false, email: true }
// --- SYNTHETIC FALLBACKS END ---


export default function MembershipClient({ plans }) {
    const { brand } = useBrand()

    // Ensure we have a plan even if DB is empty
    const defaultLocalPlan = plans.find(p => p.name === ME.plan) || plans[0] || { name: 'Basic Pass', price: 9.99, features: ['Gym Access'] }

    const qrData = encodeURIComponent(JSON.stringify({ id: ME.id, name: ME.name, plan: ME.plan, gym: brand.gymName, exp: ME.expiry }))
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&bgcolor=0a0a0a&color=ffffff&data=${qrData}`

    const daysLeft = Math.ceil((new Date(ME.expiry) - new Date()) / (1000 * 60 * 60 * 24))

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
                        <div className="text-[10px] uppercase tracking-widest text-foreground/70">{brand.gymName} · Member Pass</div>
                        <div className="font-display text-2xl md:text-3xl font-bold mt-2 leading-tight">{ME.name}</div>
                        <div className="mt-1 text-sm text-foreground/80">ID · {ME.id.toUpperCase()}</div>
                        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <Sparkles className="h-3 w-3" /> {ME.plan}
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <div className="text-foreground/50 uppercase text-[9px] tracking-widest">Joined</div>
                                <div className="text-foreground mt-0.5">{ME.joined}</div>
                            </div>
                            <div>
                                <div className="text-foreground/50 uppercase text-[9px] tracking-widest">Expires</div>
                                <div className="text-foreground mt-0.5">{ME.expiry}</div>
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
                    <div className="font-display text-3xl font-bold mt-2">{ME.expiry}</div>
                    <div className="text-xs text-foreground/50 mt-1">{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</div>
                    <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(5, Math.min(100, (daysLeft / 365) * 100))}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: brand.primaryColor }} />
                    </div>
                </div>
                <div className="rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5">
                    <div className="flex items-center gap-2 text-xs text-foreground/50"><Shield className="h-3.5 w-3.5" /> AUTO RENEW</div>
                    <div className="font-display text-3xl font-bold mt-2">Enabled</div>
                    <div className="text-xs text-foreground/50 mt-1">Charged to Visa ···· 4211</div>
                    <button className="mt-4 text-xs text-foreground/70 hover:text-foreground flex items-center gap-1">Manage billing <ChevronRight className="h-3 w-3" /></button>
                </div>
            </div>

            {/* Plan details */}
            <div className="mt-4 rounded-3xl border p-6" style={{ borderColor: `${brand.primaryColor}30`, background: `linear-gradient(135deg, ${brand.primaryColor}08, transparent)` }}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-foreground/50">Your plan</div>
                        <div className="font-display text-2xl font-bold mt-1">{defaultLocalPlan.name}</div>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="font-display text-3xl font-bold">${defaultLocalPlan.price}</span>
                            <span className="text-foreground/50 text-sm">/mo</span>
                        </div>
                    </div>
                    <button className="h-9 px-4 rounded-lg text-xs font-medium text-foreground" style={{ background: brand.primaryColor }}>Upgrade</button>
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
