'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, User, CreditCard, Palette, QrCode, Check, ArrowLeft, ArrowRight, Fingerprint, ClipboardList } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const SA = '#8b5cf6'

const STEPS = [
    { id: 1, label: 'Basic Info', icon: Building2 },
    { id: 2, label: 'Owner Details', icon: User },
    { id: 3, label: 'Choose Plan', icon: CreditCard },
    { id: 4, label: 'Branding', icon: Palette },
    { id: 5, label: 'Attendance', icon: QrCode },
]

const PLANS = [
    { id: 'basic', name: 'Basic', price: '₹4,999/mo', color: '#a3a3a3', features: ['Up to 200 members', 'QR attendance', '1 trainer', 'Basic reports'] },
    { id: 'pro', name: 'Pro', price: '₹14,999/mo', color: '#8b5cf6', features: ['Up to 1000 members', 'Biometric + QR', '10 trainers', 'AI Insights', 'White-label'], popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '₹39,999/mo', color: '#f59e0b', features: ['Unlimited members', 'Full integrations', 'Unlimited trainers', 'Priority support', 'Custom domain'] },
]

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function CreateGymPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        gymName: '', logo: '',
        ownerName: '', ownerEmail: '', ownerPhone: '', ownerPassword: '',
        plan: 'pro',
        primaryColor: '#8b5cf6', accentColor: '#a78bfa', domain: '',
        attendance: 'qr',
    })

    const up = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const next = () => setStep(s => Math.min(s + 1, 5))
    const prev = () => setStep(s => Math.max(s - 1, 1))

    const finish = () => {
        toast.success(`${form.gymName || 'New Gym'} created successfully!`)
        router.push('/super-admin/gyms')
    }

    return (
        <SuperAdminShell title="Create New Gym" subtitle="Step-by-step gym onboarding wizard">
            {/* Stepper */}
            <div className="flex items-center justify-center gap-1 mb-8">
                {STEPS.map((s, i) => {
                    const Icon = s.icon
                    const done = step > s.id
                    const active = step === s.id
                    return (
                        <div key={s.id} className="flex items-center">
                            <button onClick={() => setStep(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${active ? 'bg-foreground/[0.06] text-foreground' : done ? 'text-foreground/60' : 'text-foreground/30'}`}>
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${active ? 'border-purple-500 text-foreground' : done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-foreground/10 text-foreground/30'}`} style={active ? { background: `${SA}30` } : {}}>
                                    {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                                </div>
                                <span className="hidden sm:inline font-medium">{s.label}</span>
                            </button>
                            {i < STEPS.length - 1 && <div className={`w-6 h-px mx-1 ${done ? 'bg-emerald-500/50' : 'bg-white/10'}`} />}
                        </div>
                    )
                })}
            </div>

            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
                        <h2 className="font-display text-xl font-bold mb-1">Gym Information</h2>
                        <p className="text-sm text-foreground/50 mb-6">Enter the gym's basic details.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Gym Name *</label>
                                <Input value={form.gymName} onChange={e => up('gymName', e.target.value)} placeholder="e.g. Iron Peak Gym" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Logo Text (initial letter)</label>
                                <Input value={form.logo} onChange={e => up('logo', e.target.value)} placeholder="e.g. I" maxLength={2} className="h-11 bg-foreground/[0.03] border-foreground/10 w-24" />
                            </div>
                            {form.gymName && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/5">
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold font-display text-lg text-foreground" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.accentColor})` }}>{form.logo || form.gymName[0]}</div>
                                    <div>
                                        <div className="font-display font-bold">{form.gymName}</div>
                                        <div className="text-[10px] text-foreground/40">Preview</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Owner */}
                {step === 2 && (
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
                        <h2 className="font-display text-xl font-bold mb-1">Owner Information</h2>
                        <p className="text-sm text-foreground/50 mb-6">Set up the gym owner's account.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Owner Name *</label>
                                <Input value={form.ownerName} onChange={e => up('ownerName', e.target.value)} placeholder="Full name" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Email *</label>
                                <Input value={form.ownerEmail} onChange={e => up('ownerEmail', e.target.value)} placeholder="owner@email.com" type="email" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Phone</label>
                                <Input value={form.ownerPhone} onChange={e => up('ownerPhone', e.target.value)} placeholder="+91 9876543210" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Temporary Password *</label>
                                <Input value={form.ownerPassword} onChange={e => up('ownerPassword', e.target.value)} placeholder="Min 8 characters" type="password" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Plan */}
                {step === 3 && (
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
                        <h2 className="font-display text-xl font-bold mb-1">Choose Plan</h2>
                        <p className="text-sm text-foreground/50 mb-6">Select the subscription tier for this gym.</p>
                        <div className="grid gap-3">
                            {PLANS.map(p => (
                                <button key={p.id} onClick={() => up('plan', p.id)} className={`relative text-left rounded-xl border p-5 transition ${form.plan === p.id ? 'border-purple-500 bg-purple-500/10' : 'border-foreground/5 bg-foreground/[0.02] hover:border-foreground/15'}`}>
                                    {p.popular && <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full" style={{ background: `${p.color}20`, color: p.color }}>Popular</span>}
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                                            <CreditCard className="h-4 w-4" style={{ color: p.color }} />
                                        </div>
                                        <div>
                                            <div className="font-display font-semibold">{p.name}</div>
                                            <div className="text-sm text-foreground/60">{p.price}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {p.features.map(f => <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-foreground/60">{f}</span>)}
                                    </div>
                                    {form.plan === p.id && <div className="absolute top-5 right-5"><Check className="h-5 w-5 text-purple-400" /></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Branding */}
                {step === 4 && (
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
                        <h2 className="font-display text-xl font-bold mb-1">Branding</h2>
                        <p className="text-sm text-foreground/50 mb-6">Set up the gym's theme and colors.</p>
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs text-foreground/60 mb-2 block">Primary Color</label>
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => up('primaryColor', c)} className={`h-9 w-9 rounded-lg border-2 transition ${form.primaryColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-foreground/60 mb-1.5 block">Custom Domain (optional)</label>
                                <Input value={form.domain} onChange={e => up('domain', e.target.value)} placeholder="e.g. app.ironpeakgym.com" className="h-11 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-foreground/5" style={{ background: `linear-gradient(135deg, ${form.primaryColor}12, transparent)` }}>
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold font-display text-lg text-foreground" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}88)` }}>{form.logo || form.gymName?.[0] || 'G'}</div>
                                <div>
                                    <div className="font-display font-bold">{form.gymName || 'Gym Name'}</div>
                                    <div className="text-[10px] text-foreground/40">Theme preview</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Attendance */}
                {step === 5 && (
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
                        <h2 className="font-display text-xl font-bold mb-1">Attendance Setup</h2>
                        <p className="text-sm text-foreground/50 mb-6">Choose the default attendance method.</p>
                        <div className="grid gap-3">
                            {[
                                { id: 'qr', label: 'QR Code', desc: 'Members scan QR at entry', icon: QrCode, color: '#3b82f6' },
                                { id: 'biometric', label: 'Biometric', desc: 'Fingerprint / face recognition', icon: Fingerprint, color: '#22c55e' },
                                { id: 'manual', label: 'Manual', desc: 'Staff logs attendance manually', icon: ClipboardList, color: '#f59e0b' },
                            ].map(a => (
                                <button key={a.id} onClick={() => up('attendance', a.id)} className={`flex items-center gap-4 text-left rounded-xl border p-5 transition ${form.attendance === a.id ? 'border-purple-500 bg-purple-500/10' : 'border-foreground/5 bg-foreground/[0.02] hover:border-foreground/15'}`}>
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                                        <a.icon className="h-5 w-5" style={{ color: a.color }} />
                                    </div>
                                    <div>
                                        <div className="font-display font-semibold">{a.label}</div>
                                        <div className="text-xs text-foreground/50">{a.desc}</div>
                                    </div>
                                    {form.attendance === a.id && <Check className="h-5 w-5 text-purple-400 ml-auto" />}
                                </button>
                            ))}
                        </div>

                        {/* Review Summary */}
                        <div className="mt-6 rounded-xl border border-foreground/5 bg-black/30 p-5">
                            <div className="text-xs uppercase tracking-widest text-foreground/40 mb-3">Review</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-foreground/40">Gym: </span><span className="font-medium">{form.gymName || '—'}</span></div>
                                <div><span className="text-foreground/40">Owner: </span><span className="font-medium">{form.ownerName || '—'}</span></div>
                                <div><span className="text-foreground/40">Plan: </span><span className="font-medium capitalize">{form.plan}</span></div>
                                <div><span className="text-foreground/40">Attendance: </span><span className="font-medium capitalize">{form.attendance}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                    {step > 1 ? (
                        <Button variant="outline" onClick={prev} className="bg-foreground/[0.03] border-foreground/10 h-10 text-sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                    ) : <div />}
                    {step < 5 ? (
                        <Button onClick={next} className="h-10 text-foreground border-0 text-sm hover:brightness-110" style={{ background: SA }}> Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
                    ) : (
                        <Button onClick={finish} className="h-10 text-foreground border-0 text-sm hover:brightness-110" style={{ background: '#22c55e' }}><Check className="h-4 w-4 mr-2" /> Create Gym</Button>
                    )}
                </div>
            </div>
        </SuperAdminShell>
    )
}
