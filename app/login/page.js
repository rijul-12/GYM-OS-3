'use client'
import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, Loader2, Check, ChevronRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { useAuth, ROLES, DEMO_CREDS } from '@/lib/auth'
import { toast } from 'sonner'

// --- SYNTHETIC FALLBACKS START ---
const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const WORKOUT_DIST = [{ name: 'Strength', value: 45, color: '#ef4444' }, { name: 'Cardio', value: 30, color: '#3b82f6' }]
const IMAGES = { feature3: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg' }
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


const ROLE_LIST = [
  { id: 'owner', accent: '#ef4444', title: 'Gym Owner', tagline: 'Full command center', points: ['Members & trainers', 'Revenue & billing', 'White-label + integrations'] },
  { id: 'trainer', accent: '#f59e0b', title: 'Trainer', tagline: 'Coach view', points: ['Assigned members', 'Workout plans', 'Progress & notes'] },
  { id: 'member', accent: '#22c55e', title: 'Member', tagline: 'Personal fitness OS', points: ['Live gym data', 'My workouts', 'Membership card'] },
]

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { brand } = useBrand()
  const { signIn, user } = useAuth()

  const [role, setRole] = useState(null)
  const [step, setStep] = useState('role') // 'role' | 'creds' | 'success'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)

  // If already logged in, forward to appropriate home
  useEffect(() => {
    if (user) {
      if (user.role === 'owner' && user.onboarded === false) {
        router.replace('/onboarding')
      } else {
        const cb = params.get('callback')
        if (cb) router.replace(cb)
        else router.replace(ROLES[user.role]?.home || '/')
      }
    }
  }, [user, router, params])

  const pickRole = (r) => {
    setRole(r)
    setEmail(`${r}@gymos.com`)
    setPassword('123456')
    setError('')
    setStep('creds')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const session = await signIn({ email, password, role: role, remember })
      setStep('success')
      let dest = ROLES[session.role].home;
      if (session.role === 'owner' && session.onboarded === false) dest = '/onboarding';
      setTimeout(() => {
        const cb = params.get('callback')
        if (cb) router.push(cb)
        else router.push(dest)
      }, 900)
    } catch (err) {
      setError(err.message || 'Sign-in failed')
      setShake(s => s + 1)
    } finally { setLoading(false) }
  }


  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left visual */}
      <div className="relative hidden lg:block overflow-hidden">
        <Image src={IMAGES.feature3} className="absolute inset-0 w-full h-full object-cover" alt="" width={120} height={120} />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
        <div className="absolute top-8 left-8"><Link href="/"><Logo size="lg" /></Link></div>
        <div className="absolute bottom-10 left-10 right-10">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
            “The operating system every serious gym owner has been waiting for.”
          </motion.h2>
          <div className="mt-6 flex items-center gap-3">
            <Image src="https://i.pravatar.cc/60?img=60" className="h-10 w-10 rounded-full" alt="" width={120} height={120} />
            <div>
              <div className="text-sm font-semibold">James Holloway</div>
              <div className="text-xs text-foreground/50">Owner · Iron Peak Gym</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Link href="/"><Logo size="lg" /></Link></div>

          <AnimatePresence mode="wait">
            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Step 1 of 2</div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Sign in as</h1>
                <p className="text-sm text-foreground/50 mt-1">Pick your role to continue.</p>

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

                <div className="mt-6 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3 flex items-center gap-2 text-xs text-foreground/60">
                  <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: brand.primaryColor }} />
                  Demo access — each role has pre-filled credentials on the next screen.
                </div>
              </motion.div>
            )}

            {step === 'creds' && (
              <motion.div key="creds" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <button onClick={() => { setStep('role'); setError('') }} className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground mb-4">
                  <ArrowLeft className="h-3.5 w-3.5" /> Change role
                </button>
                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Step 2 of 2</div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Sign in as {ROLES[role].label}</h1>
                <p className="text-sm text-foreground/50 mt-1">Demo credentials are pre-filled — hit Sign in.</p>

                <motion.form key={shake} initial={{ x: 0 }} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} onSubmit={submit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs text-foreground/60">Email</label>
                    <div className="mt-1.5 relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 bg-foreground/[0.03] border-foreground/10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60">Password</label>
                    <div className="mt-1.5 relative">
                      <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11 bg-foreground/[0.03] border-foreground/10" />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -6, height: 0 }} className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs px-3 py-2">
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2 text-foreground/60 cursor-pointer"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-red-500" /> Remember me</label>
                    <Link href="/forgot-password" className="text-foreground/60 hover:text-foreground">Forgot password?</Link>
                  </div>

                  <Button type="submit" disabled={loading} style={{ background: brand.primaryColor }} className="w-full h-11 text-foreground border-0 hover:opacity-90">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4 ml-2" /></>}
                  </Button>
                </motion.form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-16">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="h-20 w-20 rounded-full flex items-center justify-center mb-4" style={{ background: `${brand.primaryColor}22`, border: `2px solid ${brand.primaryColor}` }}>
                  <Check className="h-9 w-9" style={{ color: brand.primaryColor }} />
                </motion.div>
                <h2 className="font-display text-2xl font-bold">Welcome back</h2>
                <p className="text-sm text-foreground/50 mt-1">Opening your {ROLES[role]?.label} workspace…</p>
                <div className="mt-6 flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: brand.primaryColor }} />
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: brand.primaryColor, animationDelay: '0.2s' }} />
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: brand.primaryColor, animationDelay: '0.4s' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex flex-col items-center gap-2 text-sm text-foreground/50">
            <p>New to GymOS? <Link href="/register" className="text-foreground hover:underline transition">Create your workspace</Link></p>
            <Link href="/" className="hover:text-foreground transition">← Back to website</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
