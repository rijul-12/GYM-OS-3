'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Loader2, Upload, Plus, Check, MapPin, Search, Copy, RefreshCcw, Link2, Download, Flame, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { useBrand } from '@/components/brand-provider'
import { completeOnboarding } from '@/actions/db/onboarding'

export default function OnboardingWizard() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { setBrand } = useBrand()
    const [loading, setLoading] = useState(false)

    // Core State
    const [step, setStep] = useState(1)

    // Step payloads
    const [gymInfo, setGymInfo] = useState({ name: '', city: 'Loading...' })
    const [logo, setLogo] = useState(null)
    const [hours, setHours] = useState({
        Mon: { open: '06:00', close: '22:00' },
        Tue: { open: '06:00', close: '22:00' },
        Wed: { open: '06:00', close: '22:00' },
        Thu: { open: '06:00', close: '22:00' },
        Fri: { open: '06:00', close: '22:00' },
        Sat: { open: '08:00', close: '20:00' },
        Sun: { open: '08:00', close: '18:00' }
    })
    const [plans, setPlans] = useState([
        { name: 'Basic Membership', price: '29.99', features: '24/7 Access, Locker Room' },
        { name: 'Premium Pass', price: '49.99', features: '24/7 Access, All Classes, Guest Pass' }
    ])
    const [attendanceMode, setAttendanceMode] = useState('QR') // Manual | QR | Biometric
    const [equipment, setEquipment] = useState({
        Cardio: [{ id: 'treadmill', name: 'Treadmill', qty: 10 }, { id: 'elliptical', name: 'Elliptical', qty: 5 }, { id: 'bike', name: 'Stationary Bike', qty: 5 }],
        Legs: [{ id: 'leg_press', name: 'Leg Press', qty: 2 }, { id: 'squat_rack', name: 'Squat Rack', qty: 2 }, { id: 'leg_ext', name: 'Leg Extension', qty: 2 }],
        Chest: [{ id: 'bench_press', name: 'Bench Press', qty: 3 }, { id: 'pec_deck', name: 'Pec Deck', qty: 1 }],
        Back: [{ id: 'lat_pull', name: 'Lat Pulldown', qty: 2 }, { id: 'rowing', name: 'Seated Row', qty: 2 }],
        Weights: [{ id: 'dumbbells', name: 'Dumbbell Set', qty: 1 }, { id: 'kettlebells', name: 'Kettlebells', qty: 1 }]
    })

    useEffect(() => {
        // Pre-fill gym info from session if possible or fetch (Mocking extraction for visual flow)
        if (user) {
            setGymInfo({ name: user.name + "'s Gym" || 'Your Gym', city: 'Global Node' })
        }
    }, [user])

    const handleNext = () => setStep(s => Math.min(s + 1, 8))
    const handleBack = () => setStep(s => Math.max(s - 1, 1))

    const addPlan = () => {
        setPlans([...plans, { name: '', price: '', features: '' }])
    }

    const removePlan = (index) => {
        const p = [...plans]
        p.splice(index, 1)
        setPlans(p)
    }

    const updatePlan = (index, field, value) => {
        const p = [...plans]
        p[index][field] = value
        setPlans(p)
    }

    const updateEquipment = (category, index, increment) => {
        setEquipment(prev => {
            const copy = { ...prev }
            const currentItem = copy[category][index]
            currentItem.qty = Math.max(0, currentItem.qty + increment)
            return copy
        })
    }

    const updateHour = (day, type, val) => {
        setHours({ ...hours, [day]: { ...hours[day], [type]: val } })
    }

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        toast("Copied to clipboard!", { className: 'bg-card text-foreground border-foreground/10' })
    }

    const submitOnboarding = async () => {
        setLoading(true)
        try {
            await completeOnboarding({ gymInfo, logo, hours, plans, attendanceMode, equipment })
            setBrand({ gymName: gymInfo.name })
            toast.success("Workspace Synthesized.")
            router.push('/dashboard')
        } catch (err) {
            toast.error(err.message)
            setLoading(false)
        }
    }

    // Step UI Mapping
    const RENDER_STEP = {
        1: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">1. Concept Verification</h2>
                <p className="text-sm text-foreground/50 mb-6">Confirm your workspace structural identity.</p>
                <div>
                    <label className="text-xs text-foreground/60 mb-1.5 block">Workspace Name</label>
                    <Input value={gymInfo.name} onChange={e => setGymInfo({ ...gymInfo, name: e.target.value })} className="h-12 bg-foreground/[0.03]" />
                </div>
                <div>
                    <label className="text-xs text-foreground/60 mb-1.5 block">Location Node</label>
                    <Input value={gymInfo.city} onChange={e => setGymInfo({ ...gymInfo, city: e.target.value })} className="h-12 bg-foreground/[0.03]" />
                </div>
            </div>
        ),
        2: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">2. Visual Identity</h2>
                <p className="text-sm text-foreground/50 mb-6">Upload your brand logo for invoices and member portals.</p>
                <div className="border-2 border-dashed border-foreground/10 rounded-2xl h-48 flex flex-col items-center justify-center hover:bg-foreground/[0.02] transition cursor-pointer text-foreground/40 hover:text-foreground group">
                    <Upload className="h-8 w-8 mb-3 opacity-50 group-hover:opacity-100 transition" />
                    <span className="text-sm font-medium">Click to upload logo PNG/SVG</span>
                    <span className="text-xs mt-1">Recommended size 400x120</span>
                </div>
            </div>
        ),
        3: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">3. Operations Schedule</h2>
                <p className="text-sm text-foreground/50 mb-6">Define your active facility availability window.</p>
                <div className="space-y-2">
                    {Object.keys(hours).map(day => (
                        <div key={day} className="flex items-center gap-3 bg-foreground/[0.02] p-2 px-3 rounded-lg border border-foreground/5">
                            <span className="w-10 text-sm font-semibold">{day}</span>
                            <Input type="time" value={hours[day].open} onChange={(e) => updateHour(day, 'open', e.target.value)} className="h-9 w-32 bg-transparent text-sm border-foreground/10" />
                            <span className="text-foreground/40">to</span>
                            <Input type="time" value={hours[day].close} onChange={(e) => updateHour(day, 'close', e.target.value)} className="h-9 w-32 bg-transparent text-sm border-foreground/10" />
                        </div>
                    ))}
                </div>
            </div>
        ),
        4: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">4. Bootstrap Memberships</h2>
                <p className="text-sm text-foreground/50 mb-6">Create your foundational tier models. You can edit these later.</p>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
                    {plans.map((p, i) => (
                        <div key={i} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 relative group">
                            <button onClick={() => removePlan(i)} className="absolute top-3 right-3 text-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash className="h-4 w-4" /></button>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-foreground/50">Plan Tier</label>
                                    <Input value={p.name} onChange={e => updatePlan(i, 'name', e.target.value)} placeholder="Basic" className="h-9 bg-foreground/[0.04] mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-foreground/50">Price / Mo</label>
                                    <Input value={p.price} onChange={e => updatePlan(i, 'price', e.target.value)} placeholder="0.00" type="number" className="h-9 bg-foreground/[0.04] mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-foreground/50">Features (Comma separated)</label>
                                <Input value={p.features} onChange={e => updatePlan(i, 'features', e.target.value)} className="h-9 bg-foreground/[0.04] mt-1" />
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addPlan} className="w-full border-dashed border-foreground/20 h-10 text-foreground/50 hover:text-foreground hover:bg-foreground/[0.05]"><Plus className="h-4 w-4 mr-2" /> Add Tier</Button>
                </div>
            </div>
        ),
        5: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">5. Gate Access Mode</h2>
                <p className="text-sm text-foreground/50 mb-6">Select how members seamlessly access your facility.</p>
                <div className="grid gap-3">
                    <button onClick={() => setAttendanceMode('Manual')} className={`p-4 rounded-xl border flex items-start gap-4 transition text-left ${attendanceMode === 'Manual' ? 'border-red-500/50 bg-red-500/10' : 'border-foreground/10 hover:border-foreground/20'}`}>
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center"><Check className="h-5 w-5" /></div>
                        <div>
                            <div className="font-semibold mb-1">Manual Reception</div>
                            <div className="text-xs text-foreground/50">You or front-desk staff check members in through the portal directly.</div>
                        </div>
                    </button>
                    <button onClick={() => setAttendanceMode('QR')} className={`p-4 rounded-xl border flex items-start gap-4 transition text-left ${attendanceMode === 'QR' ? 'border-red-500/50 bg-red-500/10' : 'border-foreground/10 hover:border-foreground/20'}`}>
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center"><Search className="h-5 w-5" /></div>
                        <div>
                            <div className="font-semibold mb-1">QR Kiosk (Recommended)</div>
                            <div className="text-xs text-foreground/50">Members scan securely from their mobile app scaling indefinitely.</div>
                        </div>
                    </button>
                    <button onClick={() => setAttendanceMode('Biometric')} className={`p-4 rounded-xl border flex items-start gap-4 transition text-left ${attendanceMode === 'Biometric' ? 'border-red-500/50 bg-red-500/10' : 'border-foreground/10 hover:border-foreground/20'}`}>
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center"><Flame className="h-5 w-5" /></div>
                        <div>
                            <div className="font-semibold mb-1">eSSL / ZKTeco Biometrics</div>
                            <div className="text-xs text-foreground/50">API Webhook integrated natively natively firing hardware events.</div>
                        </div>
                    </button>
                </div>
            </div>
        ),
        6: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">6. Facility Equipment</h2>
                <p className="text-sm text-foreground/50 mb-6">Declare standard hardware quotas for capacity analysis.</p>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
                    {Object.keys(equipment).map(cat => (
                        <div key={cat} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
                            <div className="p-3 bg-foreground/[0.05] font-semibold text-xs uppercase tracking-wider">{cat}</div>
                            <div className="p-2 space-y-1">
                                {equipment[cat].map((item, i) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-foreground/[0.03]">
                                        <div className="text-sm">{item.name}</div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => updateEquipment(cat, i, -1)} className="h-6 w-6 rounded flex items-center justify-center bg-white/10 hover:bg-white/20">-</button>
                                            <div className="w-4 text-center text-sm font-mono">{item.qty}</div>
                                            <button onClick={() => updateEquipment(cat, i, 1)} className="h-6 w-6 rounded flex items-center justify-center bg-white/10 hover:bg-white/20">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        7: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">7. Provision Trainers</h2>
                <p className="text-sm text-foreground/50 mb-6">Invite your staff to create their coaching profiles securely linked to your network.</p>
                <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center mb-4"><Link2 className="h-7 w-7 text-foreground/80" /></div>
                    <div className="font-semibold mb-2">Trainer Invitation Link</div>
                    <p className="text-xs text-foreground/50 max-w-sm mb-6">Share this exact secure URL. It forces them into the Trainer registration variant pre-populated with your access code.</p>

                    <div className="w-full flex">
                        <Input readOnly value={`gym-os.vercel.app/register?role=trainer&code=${user?.gymCode}`} className="rounded-r-none border-r-0 bg-card border-foreground/20 text-foreground/50 selection:bg-red-500/30" />
                        <Button onClick={() => handleCopy(`gym-os.vercel.app/register?role=trainer&code=${user?.gymCode}`)} className="rounded-l-none bg-red-600 hover:bg-red-700 text-foreground"><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        ),
        8: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">8. Massive Member Ingestion</h2>
                <p className="text-sm text-foreground/50 mb-6">Bootstrapping the network. Standard procedure.</p>
                <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/5 flex flex-col items-center justify-center text-center">
                    <div className="bg-white p-2 rounded-xl mb-6">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=example" alt="QR" className="h-32 w-32 rounded-lg opacity-80" />
                    </div>
                    <div className="font-semibold mb-1">Printable Reception Code</div>
                    <p className="text-xs text-foreground/50 max-w-sm mb-6">Drop this raw QR code printed at your main door or reception terminal driving immediate frictionless registration.</p>

                    <Button variant="outline" className="w-full border-foreground/20 bg-card text-foreground hover:bg-white/10"><Download className="h-4 w-4 mr-2" /> Download Display Kit (PDF)</Button>
                </div>
            </div>
        )
    }

    // Check unauthenticated edge-case
    useEffect(() => {
        // Disabled aggressive unauthenticated loop-bouncing.
    }, [user, authLoading, router])

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">

            {/* Topbar Progress */}
            <div className="h-1.5 w-full bg-white/5 shrink-0 fixed top-0 left-0 z-50">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(step / 8) * 100}%` }} className="h-full bg-red-500" transition={{ duration: 0.4 }} />
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {RENDER_STEP[step]}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Nav */}
                    <div className="mt-12 flex justify-between items-center border-t border-foreground/10 pt-4">
                        <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading} className="text-foreground/50 hover:text-foreground px-0 hover:bg-transparent">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>

                        {step < 8 ? (
                            <Button onClick={handleNext} className="bg-red-600 hover:bg-red-700 text-foreground rounded-full px-6">
                                Next Step <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={submitOnboarding} disabled={loading} className="bg-white hover:bg-white/90 text-black font-semibold rounded-full px-6">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Finalize Boot sequence
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
