'use client'
import Image from 'next/image'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2, ShieldCheck, Dumbbell, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { toast } from 'sonner'
import { processOwnerRegistration, processTrainerRegistration, processMemberRegistration } from '@/actions/db/registration'

const IMAGES = {
    feature3: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg'
}

const ROLES = {
    owner: { label: 'Owner', icon: <ShieldCheck /> },
    trainer: { label: 'Trainer', icon: <Dumbbell /> },
    member: { label: 'Member', icon: <Search /> },
}

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Cardio', 'Mobility', 'Full Body', 'Other']

const ROLE_LIST = [
    { id: 'owner', accent: '#ef4444', title: 'Gym Owner', tagline: 'Create a new BGM Workspace', points: ['Generate Gym Code', 'Full Command Center'] },
    { id: 'trainer', accent: '#f59e0b', title: 'Trainer', tagline: 'Join an existing Gym', points: ['Requires Gym Code', 'Training dashboard'] },
    { id: 'member', accent: '#22c55e', title: 'Member', tagline: 'Sign up to your Gym', points: ['Requires Gym Code', 'Live workout tracking'] },
]

function RegisterContent() {
    const router = useRouter()
    const { brand } = useBrand()

    const [role, setRole] = useState(null)
    const [step, setStep] = useState('role') // 'role' | 'form' | 'success'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [shake, setShake] = useState(0)

    // Form State
    const [formData, setFormData] = useState({
        // Generic
        email: '', password: '', confirmPassword: '', phone: '',
        // Owner
        gymName: '', ownerName: '', city: '', state: '', country: '', gymType: 'Commercial', membershipCapacity: '500', currency: '₹ INR', timezone: 'Asia/Kolkata',
        // Trainer
        gymCode: '', trainerName: '', specialization: 'Hypertrophy', experience: '3 Years', workingDays: 'Mon-Fri', preferredTiming: 'Morning',
        // Member
        name: '', age: '', gender: 'Male', height: '', weight: '', fitnessGoal: '', medicalConditions: 'None', emergencyContact: '',
        workoutSchedule: 'Morning', preferredWorkoutTime: '6:00 AM', trainingDays: '5 Days', primaryWorkoutSplit: 'Push Pull Legs', preferredWorkoutDuration: '60 min',
        noFixedSchedule: false,
        weeklySchedule: { Monday: ['Chest'], Tuesday: ['Back'], Wednesday: [], Thursday: ['Legs'], Friday: ['Shoulders', 'Triceps'], Saturday: ['Cardio'], Sunday: [] }
    })

    const [gymCodeFinal, setGymCodeFinal] = useState('')

    const pickRole = (r) => {
        setRole(r)
        setError('')
        setStep('form')
    }

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const submit = async (e) => {
        e.preventDefault()
        setError(''); setLoading(true)

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match!")
            setShake(s => s + 1)
            setLoading(false)
            return
        }

        try {
            let res;
            if (role === 'owner') {
                res = await processOwnerRegistration(formData)
                if (res.error) throw new Error(res.error)
                setGymCodeFinal(res.gymCode)
            } else if (role === 'trainer') {
                res = await processTrainerRegistration(formData)
                if (res.error) throw new Error(res.error)
            } else if (role === 'member') {
                res = await processMemberRegistration(formData)
                if (res.error) throw new Error(res.error)
            }

            setStep('success')
        } catch (err) {
            setError(err.message || 'Registration failed')
            setShake(s => s + 1)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
            {/* Left visual */}
            <div className="relative hidden lg:block overflow-hidden">
                <Image src={IMAGES.feature3} className="absolute inset-0 w-full h-full object-cover" alt="" width={1000} height={1000} />
                <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
                <div className="absolute top-8 left-8"><Link href="/"><Logo size="lg" /></Link></div>
                <div className="absolute bottom-10 left-10 right-10">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
                        "Your fitness empire, engineered for the digital age."
                    </motion.h2>
                    <div className="mt-6 flex items-center gap-3">
                        <Image src="https://i.pravatar.cc/60?img=60" className="h-10 w-10 rounded-full" alt="" width={60} height={60} />
                        <div>
                            <div className="text-sm font-semibold">Join BGM</div>
                            <div className="text-xs text-foreground/50">Next-Generation Infrastructure</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="overflow-y-auto w-full h-screen relative flex justify-center no-scrollbar">
                <div className="w-full max-w-xl p-6 sm:p-10 pb-32">
                    <div className="lg:hidden mb-8"><Link href="/"><Logo size="lg" /></Link></div>

                    <AnimatePresence mode="wait">
                        {step === 'role' && (
                            <motion.div key="role" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Step 1 of 2</div>
                                <h1 className="font-display text-3xl font-bold tracking-tight">Create your Account</h1>
                                <p className="text-sm text-foreground/50 mt-1">Pick your role to configure your workspace.</p>

                                <div className="mt-6 space-y-2.5">
                                    {ROLE_LIST.map((r, i) => (
                                        <motion.button
                                            key={r.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.07 }}
                                            onClick={() => pickRole(r.id)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="group w-full text-left rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 hover:border-foreground/25 transition relative overflow-hidden"
                                        >
                                            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition" style={{ background: r.accent }} />
                                            <div className="relative flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${r.accent}22`, border: `1px solid ${r.accent}55` }}>{ROLES[r.id].icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-display font-semibold">{r.title}</div>
                                                    <div className="text-xs text-foreground/50">{r.tagline}</div>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {r.points.map((p) => (
                                                            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-foreground/60">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-foreground transition" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 'form' && (
                            <motion.div key="form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                                <button type="button" onClick={() => { setStep('role'); setError('') }} className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground mb-4">
                                    <ArrowLeft className="h-3.5 w-3.5" /> Back to roles
                                </button>
                                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Step 2 of 2</div>
                                <h1 className="font-display text-3xl font-bold tracking-tight">{ROLES[role].label} Registration</h1>

                                {role !== 'owner' && (
                                    <div className="mt-4 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 flex items-start gap-2 text-xs text-foreground/60">
                                        <MapPin className="h-4 w-4 shrink-0" style={{ color: brand.primaryColor }} />
                                        <p>You must have a valild <strong>Gym Code</strong> provided by your facility to register. Validation is strict.</p>
                                    </div>
                                )}

                                <motion.form key={shake} initial={{ x: 0 }} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} onSubmit={submit} className="mt-6 space-y-5">

                                    {/* --- GENERIC AUTH --- */}
                                    <div className="space-y-4 border-b border-foreground/10 pb-6 relative">
                                        <h3 className="text-xs uppercase tracking-widest text-foreground/50 font-bold">1. Account Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-xs text-foreground/60">Email Address *</label>
                                                <Input required type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-foreground/60">Password *</label>
                                                <Input required type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-foreground/60">Confirm Password *</label>
                                                <Input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- GYM OWNER FIELDS --- */}
                                    {role === 'owner' && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                            <h3 className="text-xs uppercase tracking-widest text-foreground/50 font-bold">2. Gym Information</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-xs text-foreground/60">Gym Name *</label>
                                                    <Input required name="gymName" value={formData.gymName} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Owner Name *</label>
                                                    <Input required name="ownerName" value={formData.ownerName} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Phone Number *</label>
                                                    <Input required name="phone" value={formData.phone} onChange={handleChange} placeholder="+1..." className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">City</label>
                                                    <Input name="city" value={formData.city} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Country</label>
                                                    <Input name="country" value={formData.country} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Gym Type</label>
                                                    <select name="gymType" value={formData.gymType} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="Commercial">Commercial</option>
                                                        <option value="Boutique">Boutique</option>
                                                        <option value="Franchise">Franchise</option>
                                                        <option value="Private Studio">Private Studio</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Expected Membership</label>
                                                    <select name="membershipCapacity" value={formData.membershipCapacity} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="100">{'< 100'}</option>
                                                        <option value="500">100 - 500</option>
                                                        <option value="1000">500 - 1000</option>
                                                        <option value="5000">1000+</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Currency</label>
                                                    <select name="currency" value={formData.currency} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="₹ INR">₹ INR</option>
                                                        <option value="$ USD">$ USD</option>
                                                        <option value="€ EUR">€ EUR</option>
                                                        <option value="£ GBP">£ GBP</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Timezone</label>
                                                    <select name="timezone" value={formData.timezone} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                                        <option value="America/New_York">America/New_York (EST)</option>
                                                        <option value="Europe/London">Europe/London (GMT)</option>
                                                        <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* --- TRAINER FIELDS --- */}
                                    {role === 'trainer' && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                            <h3 className="text-xs uppercase tracking-widest text-[#f59e0b] font-bold">2. Security Gateway</h3>
                                            <div className="col-span-2">
                                                <label className="text-xs text-foreground/60">Facility Gym Code *</label>
                                                <Input required name="gymCode" value={formData.gymCode} onChange={handleChange} placeholder="GYM-XXX-0000" className="mt-1.5 h-12 bg-foreground/[0.03] border-[#f59e0b]/50 text-xl tracking-widest text-center uppercase" />
                                            </div>
                                            <h3 className="text-xs uppercase tracking-widest text-foreground/50 font-bold mt-8 block">3. Trainer Profile</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-xs text-foreground/60">Full Name *</label>
                                                    <Input required name="trainerName" value={formData.trainerName} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Phone Number *</label>
                                                    <Input required name="phone" value={formData.phone} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Specialization</label>
                                                    <Input name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g. Hypertrophy" className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Experience</label>
                                                    <select name="experience" value={formData.experience} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="1 Year">1 Year</option>
                                                        <option value="3 Years">3 Years</option>
                                                        <option value="5+ Years">5+ Years</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Working Days</label>
                                                    <Input name="workingDays" value={formData.workingDays} onChange={handleChange} placeholder="Mon-Fri" className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* --- MEMBER FIELDS --- */}
                                    {role === 'member' && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                            <h3 className="text-xs uppercase tracking-widest text-[#22c55e] font-bold">2. Security Gateway</h3>
                                            <div className="col-span-2">
                                                <label className="text-xs text-foreground/60">Facility Gym Code *</label>
                                                <Input required name="gymCode" value={formData.gymCode} onChange={handleChange} placeholder="GYM-XXX-0000" className="mt-1.5 h-12 bg-foreground/[0.03] border-[#22c55e]/50 text-xl tracking-widest text-center uppercase" />
                                            </div>
                                            <h3 className="text-xs uppercase tracking-widest text-foreground/50 font-bold mt-8 block">3. Member Health Profile</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-xs text-foreground/60">Full Name *</label>
                                                    <Input required name="name" value={formData.name} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Phone</label>
                                                    <Input name="phone" value={formData.phone} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Age</label>
                                                    <Input name="age" type="number" value={formData.age} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Gender</label>
                                                    <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Height / Weight *</label>
                                                    <div className="flex gap-2">
                                                        <Input required placeholder="cm" name="height" value={formData.height} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                        <Input required placeholder="kg" name="weight" value={formData.weight} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-xs text-foreground/60">Medical Conditions</label>
                                                    <Input name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} placeholder="Any prior injuries or conditions?" className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div className="col-span-2 pt-4 border-t border-foreground/10">
                                                    <h3 className="text-xs uppercase tracking-widest text-[#22c55e] font-bold">4. Live Intelligence Configuration</h3>
                                                    <p className="text-[10px] text-foreground/40 mb-3 mt-1">This data powers your customized AI Insights on the Gym Floor.</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Workout Goal *</label>
                                                    <select required name="fitnessGoal" value={formData.fitnessGoal} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="" disabled>Select Goal</option>
                                                        <option value="Weight Loss">Weight Loss</option>
                                                        <option value="Muscle Gain">Muscle Gain</option>
                                                        <option value="Strength">Strength</option>
                                                        <option value="General Fitness">General Fitness</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Primary Split</label>
                                                    <select name="primaryWorkoutSplit" value={formData.primaryWorkoutSplit} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="Push Pull Legs">Push Pull Legs</option>
                                                        <option value="Bro Split">Bro Split</option>
                                                        <option value="Upper Lower">Upper Lower</option>
                                                        <option value="Custom">Custom</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Preferred Start Time</label>
                                                    <Input name="preferredWorkoutTime" type="time" value={formData.preferredWorkoutTime} onChange={handleChange} className="mt-1.5 h-11 bg-foreground/[0.03]" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">Avg. Duration</label>
                                                    <select name="preferredWorkoutDuration" value={formData.preferredWorkoutDuration} onChange={handleChange} className="mt-1.5 h-11 w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
                                                        <option value="60 min">60 min</option>
                                                        <option value="90 min">90 min</option>
                                                        <option value="120 min">120 min</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2 pt-4 border-t border-foreground/10 mt-2">
                                                    <h3 className="text-xs uppercase tracking-widest text-[#22c55e] font-bold">5. Daily Structural Schedule</h3>
                                                    <p className="text-[10px] text-foreground/40 mb-3 mt-1">Map your target muscle groups per day to power our live occupancy prediction engine allowing others to see live demand capacities accurately.</p>

                                                    <label className="flex items-center gap-3 mb-6 p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] cursor-pointer hover:border-[#22c55e]/50 transition">
                                                        <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${formData.noFixedSchedule ? 'bg-[#22c55e] border-[#22c55e]' : 'border-foreground/20'}`}>
                                                            {formData.noFixedSchedule && <Check className="h-3.5 w-3.5 text-black" />}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={formData.noFixedSchedule === true} onChange={e => setFormData({ ...formData, noFixedSchedule: e.target.checked })} />
                                                        <div>
                                                            <div className="text-sm font-semibold text-foreground">No Fixed Schedule</div>
                                                            <div className="text-[10px] text-foreground/50 mt-0.5">I train different muscles at different times each week without a strict routine.</div>
                                                        </div>
                                                    </label>

                                                    {!formData.noFixedSchedule && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {Object.keys(formData.weeklySchedule).map(day => (
                                                                <div key={day} className="bg-foreground/[0.015] border border-foreground/5 p-4 rounded-xl">
                                                                    <div className="text-xs text-foreground block mb-3 font-bold uppercase tracking-wider">{day}</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {MUSCLES.map(muscle => {
                                                                            const isSelected = formData.weeklySchedule[day].includes(muscle);
                                                                            return (
                                                                                <label key={muscle} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium cursor-pointer transition-colors ${isSelected ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]' : 'bg-transparent border-foreground/10 text-foreground/60 hover:bg-foreground/[0.05]'}`}>
                                                                                    <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                                                                                        const isChecked = e.target.checked;
                                                                                        let newDaySchedule = [...formData.weeklySchedule[day]];
                                                                                        if (isChecked) newDaySchedule.push(muscle);
                                                                                        else newDaySchedule = newDaySchedule.filter(m => m !== muscle);
                                                                                        setFormData({ ...formData, weeklySchedule: { ...formData.weeklySchedule, [day]: newDaySchedule } });
                                                                                    }} />
                                                                                    {isSelected && <Check className="h-3 w-3" />}
                                                                                    {muscle}
                                                                                </label>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -6, height: 0 }} className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs px-3 py-2">
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="pt-4">
                                        <Button type="submit" disabled={loading} style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground border-0 hover:opacity-90">
                                            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering Identity…</> : <>Complete Registration <ArrowRight className="h-4 w-4 ml-2" /></>}
                                        </Button>
                                    </div>
                                </motion.form>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-16">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="h-24 w-24 rounded-full flex items-center justify-center mb-6" style={{ background: `${brand.primaryColor}22`, border: `2px solid ${brand.primaryColor}` }}>
                                    <Check className="h-10 w-10" style={{ color: brand.primaryColor }} />
                                </motion.div>

                                {role === 'owner' ? (
                                    <>
                                        <h2 className="font-display text-3xl font-bold mb-3">Facility Configured!</h2>
                                        <p className="text-sm text-foreground/70 max-w-md mx-auto mb-6">Your workspace is successfully initialized. Please save your master Gym Code securely. All trainers and members will require this code to link their accounts.</p>

                                        <div className="rounded-2xl border border-foreground/20 bg-foreground/[0.05] p-6 mb-8 w-full">
                                            <p className="text-xs uppercase tracking-widest text-foreground/50 font-bold mb-2">Master Gym Code</p>
                                            <div className="text-3xl font-display font-black tracking-wider" style={{ color: brand.primaryColor }}>
                                                {gymCodeFinal}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="font-display text-3xl font-bold mb-3">Registration Complete</h2>
                                        <p className="text-sm text-foreground/70 max-w-md mx-auto mb-6">Your profile is safely stored. Proceed to the login portal to finalize authentication.</p>
                                    </>
                                )}

                                <Button onClick={() => router.push('/login')} variant="outline" className="h-11 px-8 rounded-full border-foreground/10 hover:bg-white/5 text-foreground">
                                    Proceed to Login <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {step !== 'success' && (
                        <div className="mt-8 text-center text-sm text-foreground/50">
                            Already have an account? <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
                        </div>
                    )}
                </div>
            </div >
        </div >
    )
}

export default function Register() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <RegisterContent />
        </Suspense>
    )
}
