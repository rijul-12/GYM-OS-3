'use client'
import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, Loader2, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { useAuth, ROLES } from '@/lib/auth'
import { toast } from 'sonner'

const LOGIN_IMAGE = 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg'

// Only same-origin relative paths are accepted as post-login destinations.
function safeNext(params) {
  const raw = params.get('next') || params.get('callback')
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  return raw
}


const ROLE_LIST = [
  { id: 'owner', accent: '#ef4444', title: 'Gym Owner', tagline: 'Full command center', points: ['Members & trainers', 'Revenue & billing', 'White-label + integrations'] },
  { id: 'trainer', accent: '#f59e0b', title: 'Trainer', tagline: 'Coach view', points: ['Assigned members', 'Workout plans', 'Progress & notes'] },
  { id: 'member', accent: '#22c55e', title: 'Member', tagline: 'Your gym, in your pocket', points: ['QR check-in', 'My workouts', 'Membership & dues'] },
]

function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { brand } = useBrand()
  const { signIn, user, loading: authLoading } = useAuth()

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
    // Wait for the server to confirm the session: a cached summary alone must not redirect.
    if (user && !authLoading) {
      if (user.role === 'owner' && user.onboarded === false) {
        router.replace('/onboarding')
      } else {
        router.replace(safeNext(params) || ROLES[user.role]?.home || '/')
      }
    }
  }, [user, authLoading, router, params])

  // Messages handed over by redirects (e.g. trainer invitation accepted)
  const notice = params.get('message')
  const redirectError = params.get('error') || (params.get('expired') === '1' ? 'Your session has ended. Please sign in again.' : null)

  const pickRole = (r) => {
    setRole(r)
    setEmail('')
    setPassword('')
    setError('')
    setStep('creds')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const session = await signIn({ email, password, role: role, remember })
      setStep('success')
      // Navigation happens in the effect above as soon as the session is applied.
      if (!session) throw new Error('Sign-in failed')
    } catch (err) {
      setError(err.message || 'Sign-in failed')
      setShake(s => s + 1)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left visual */}
      <div className="relative hidden lg:block overflow-hidden">
        <Image src={LOGIN_IMAGE} className="absolute inset-0 w-full h-full object-cover" alt="" width={120} height={120} />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
        <div className="absolute top-8 left-8"><Link href="/"><Logo size="lg" /></Link></div>
        <div className="absolute bottom-10 left-10 right-10">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
            “Your gym runs. BGM handles the rest.”
          </motion.h2>
          <p className="mt-4 text-sm text-foreground/60">Memberships, attendance, trainers and payments in one place.</p>
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
                {notice && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-2">{notice}</div>}
                {redirectError && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs px-3 py-2">{redirectError}</div>}

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

                {/* PRODUCTION NOTE: Demonstration credentials intentionally disabled here during final deployment sweep */}
              </motion.div>
            )}

            {step === 'creds' && (
              <motion.div key="creds" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <button onClick={() => { setStep('role'); setError('') }} className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground mb-4">
                  <ArrowLeft className="h-3.5 w-3.5" /> Change role
                </button>
                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Step 2 of 2</div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Sign in as {ROLES[role].label}</h1>
                <p className="text-sm text-foreground/50 mt-1">Enter the e-mail and password for your account.</p>

                <motion.form key={shake} initial={{ x: 0 }} animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.35 }} onSubmit={submit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs text-foreground/60">Email</label>
                    <div className="mt-1.5 relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 bg-foreground/[0.03] border-foreground/10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60">Password</label>
                    <div className="mt-1.5 relative">
                      <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <Input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11 bg-foreground/[0.03] border-foreground/10" />
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
            <p>New to BGM? <Link href="/register" className="text-foreground hover:underline transition">Create your workspace</Link></p>
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
