'use client'
import Image from 'next/image'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Check, Zap, Shield, BarChart3, Users, Palette, Activity, Menu, X, Star, Sparkles, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Logo } from '@/components/logo'
import { useBrand } from '@/components/brand-provider'
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

// --- SYNTHETIC FALLBACKS START ---
const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const WORKOUT_DIST = [{ name: 'Strength', value: 45, color: '#ef4444' }, { name: 'Cardio', value: 30, color: '#3b82f6' }]
const IMAGES = {
  hero: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
  feature1: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
  feature2: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
  feature3: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
  feature4: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
  feature5: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg',
}
const PLAN_DATA = [{ name: 'Basic', price: 9.99 }, { name: 'Pro', price: 19.99 }]
const ATTENDANCE_WEEKLY = [{ day: 'Mon', in: 42, out: 38 }, { day: 'Tue', in: 55, out: 51 }]
const TESTIMONIALS = [{ text: "Great gym!", name: "User", role: "Trainer", photo: "https://i.pravatar.cc/150?img=1" }]
const FAQS = [{ q: "Hours?", a: "24/7" }]
const PLANS = [{ id: "premium", popular: true, name: 'Premium', price: 19.99, features: ['24/7 Access'] }]
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


const Nav = () => {
  const [open, setOpen] = useState(false)
  const { brand } = useBrand()
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-foreground/70">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#preview" className="hover:text-foreground transition">Dashboard</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          <a href="#contact" className="hover:text-foreground transition">Contact</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/portal" className="text-sm text-foreground/70 hover:text-foreground">Member portal</Link>
          <Link href="/login" className="text-sm text-foreground/70 hover:text-foreground">Sign in</Link>
          <Link href="/dashboard">
            <Button size="sm" style={{ background: brand.primaryColor }} className="text-foreground hover:opacity-90 border-0">
              Launch app <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        <button className="md:hidden p-2.5 -mr-2.5 rounded-lg text-foreground hover:bg-white/10 active:bg-white/20 transition" onClick={() => setOpen(!open)}>{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-foreground/5 bg-black/95 px-6 py-4 space-y-3">
          <a href="#features" className="block text-foreground/70">Features</a>
          <a href="#pricing" className="block text-foreground/70">Pricing</a>
          <a href="#faq" className="block text-foreground/70">FAQ</a>
          <Link href="/dashboard" className="block text-foreground font-semibold">Launch app →</Link>
        </div>
      )}
    </nav>
  )
}

const Hero = () => {
  const { brand } = useBrand()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 120])
  return (
    <section ref={ref} className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 radial-red pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-foreground/70 mb-8">
            <Sparkles className="h-3 w-3" style={{ color: brand.primaryColor }} />
            <span>The gym intelligence platform</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95]">
            <span className="text-gradient">See every member.</span>
            <br />
            <span className="text-gradient-red">Predict every surge.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
            {brand.gymName} is an AI-native intelligence layer that shows you who&apos;s inside, what they&apos;re training, when they&apos;ll finish, and which machines are about to bottleneck &mdash; in real time.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link href="/dashboard">
              <Button size="lg" style={{ background: brand.primaryColor }} className="text-foreground h-12 px-6 border-0 hover:opacity-90 shadow-lg shadow-red-500/20">
                Open live demo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-6 bg-foreground/[0.03] border-foreground/10 text-foreground hover:bg-foreground/[0.06]">
              <Play className="h-4 w-4 mr-2" /> Watch overview
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-foreground/40">
            <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> 14-day free trial</div>
            <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> No card required</div>
            <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> White-label ready</div>
          </div>
        </motion.div>

        <motion.div style={{ y }} className="mt-20 relative">
          <div className="absolute -inset-4 rounded-3xl bg-red-500/10 blur-3xl" />
          <div className="relative rounded-2xl overflow-hidden border border-foreground/10 glass-strong shadow-2xl">
            <Image src={IMAGES.hero} alt="Luxury gym" className="w-full h-[280px] sm:h-[420px] md:h-[520px] object-cover" width={120} height={120} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3 justify-between items-end">
              <div>
                <div className="text-xs text-foreground/50 uppercase tracking-widest mb-1">Live now</div>
                <div className="font-display text-2xl md:text-3xl font-bold">62 members inside · 78% occupancy</div>
              </div>
              <div className="flex items-center gap-2 rounded-full glass px-4 py-2 text-xs">
                <span className="h-2 w-2 rounded-full pulse-red" style={{ background: brand.primaryColor }} />
                Real-time sync
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const LogoMarquee = () => (
  <section className="py-10 border-y border-foreground/5 overflow-hidden">
    <div className="text-center text-xs text-foreground/40 uppercase tracking-widest mb-6">Powering 400+ premium gyms worldwide</div>
    <div className="flex overflow-hidden">
      <div className="flex gap-14 marquee whitespace-nowrap">
        {['IRON PEAK', 'ASCEND', 'MOMENTUM', 'APEX ATHLETIC', 'FORGE HOUSE', 'PULSE STUDIO', 'GRIT & GRACE', 'NORTH BARBELL', 'IRON PEAK', 'ASCEND', 'MOMENTUM', 'APEX ATHLETIC', 'FORGE HOUSE', 'PULSE STUDIO', 'GRIT & GRACE', 'NORTH BARBELL'].map((n, i) => (
          <span key={i} className="font-display text-2xl font-bold text-foreground/20 tracking-tight">{n}</span>
        ))}
      </div>
    </div>
  </section>
)

const Features = () => {
  const { brand } = useBrand()
  const items = [
    { icon: Activity, title: 'Live Intelligence', desc: 'See who\u2019s inside, what stage they\u2019re at, and every machine in use \u2014 with AI-predicted surges up to 6 hours ahead.', img: IMAGES.feature1 },
    { icon: Users, title: 'Per-Member Live State', desc: 'Every profile shows today\u2019s workout, check-in time, progress stage, ETA, and machine queue \u2014 in real time.', img: IMAGES.feature2 },
    { icon: BarChart3, title: 'AI Predictions', desc: 'Peak-hour forecasts, churn risk, equipment demand and revenue signals \u2014 scored with confidence intervals.', img: IMAGES.feature3 },
    { icon: Palette, title: 'True White-Label', desc: 'Change logo, colors, name, banner, footer — without touching a line of code.', img: IMAGES.feature4 },
    { icon: Shield, title: 'Enterprise Security', desc: 'SSO, role-based access, granular permissions, and full audit logs.', img: IMAGES.feature5 },
    { icon: Zap, title: 'Instant Onboarding', desc: 'CSV imports, trainer invites, membership plans — live in under an hour.', img: IMAGES.hero },
  ]
  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="text-xs uppercase tracking-widest text-foreground/40 mb-4">Everything you need</div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-gradient">One platform. Every workflow.</h2>
          <p className="mt-6 text-foreground/60">From front-desk check-ins to executive KPIs, {brand.gymName} replaces five tools with one gorgeous interface.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="group relative rounded-2xl overflow-hidden border border-foreground/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 card-hover">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-700">
                  <Image src={f.img} className="w-full h-full object-cover opacity-20" alt="" width={120} height={120} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
                </div>
                <div className="relative">
                  <div className="h-11 w-11 rounded-lg flex items-center justify-center mb-5" style={{ background: `${brand.primaryColor}20`, border: `1px solid ${brand.primaryColor}40` }}>
                    <Icon className="h-5 w-5" style={{ color: brand.primaryColor }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const DashboardPreview = () => {
  const { brand } = useBrand()
  return (
    <section id="preview" className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-widest text-foreground/40 mb-4">Live preview</div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-gradient">Investor-ready by default.</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative rounded-3xl border border-foreground/10 glass-strong p-4 md:p-8 shadow-2xl">
          <div className="grid md:grid-cols-3 gap-4">
            {[{ label: 'Total Members', v: '1,284', d: '+12%' }, { label: 'Members Inside', v: '62', d: 'Live' }, { label: 'Revenue MTD', v: '$45,900', d: '+8.2%' }].map((s, i) => (
              <div key={i} className="rounded-xl border border-foreground/5 bg-black/40 p-5">
                <div className="text-xs text-foreground/50">{s.label}</div>
                <div className="font-display text-3xl font-bold mt-1">{s.v}</div>
                <div className="text-xs mt-1" style={{ color: brand.primaryColor }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2 rounded-xl border border-foreground/5 bg-black/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-foreground/70">Weekly attendance</div>
                <div className="text-xs text-foreground/40">Last 7 days</div>
              </div>
              <div className="h-52">
                <ResponsiveContainer>
                  <AreaChart data={ATTENDANCE_WEEKLY}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.6} /><stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} /></linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="in" stroke={brand.primaryColor} fill="url(#g1)" strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-foreground/5 bg-black/40 p-5">
              <div className="text-sm text-foreground/70 mb-4">Workout mix</div>
              <div className="h-52">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={WORKOUT_DIST} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {WORKOUT_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const Pricing = () => {
  const { brand } = useBrand()
  return (
    <section id="pricing" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-widest text-foreground/40 mb-4">Membership plans</div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-gradient">Priced for every gym.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={`relative rounded-2xl border p-8 ${p.popular ? 'border-foreground/20 bg-gradient-to-b from-white/[0.06] to-transparent' : 'border-foreground/5 bg-foreground/[0.02]'}`}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium rounded-full text-foreground" style={{ background: brand.primaryColor }}>Most popular</div>}
              <div className="font-display text-xl font-semibold mb-1">{p.name}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl font-bold">${p.price}</span>
                <span className="text-foreground/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground/70">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: brand.primaryColor }} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard">
                <Button className={`w-full ${p.popular ? 'text-foreground border-0' : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.12] border-0'}`} style={p.popular ? { background: brand.primaryColor } : {}}>
                  Start with {p.name}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const Testimonials = () => (
  <section className="py-32 border-t border-foreground/5">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="text-xs uppercase tracking-widest text-foreground/40 mb-4">Loved by operators</div>
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-gradient">The best gyms run on it.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-8">
            <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-red-500 text-red-500" />)}</div>
            <p className="text-foreground/80 leading-relaxed mb-6">“{t.text}”</p>
            <div className="flex items-center gap-3">
              <Image src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" width={120} height={120} />
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-foreground/50">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

const Contact = () => {
  const { brand } = useBrand()
  return (
    <section id="contact" className="py-32 border-t border-foreground/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-gradient-red mb-6">Ready to elevate your gym?</h2>
        <p className="text-foreground/60 mb-10 max-w-xl mx-auto">Talk to our team. Or launch the live demo and explore every screen — no signup required.</p>
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link href="/dashboard"><Button size="lg" style={{ background: brand.primaryColor }} className="h-12 px-6 text-foreground border-0">Launch demo <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
          <a href={`mailto:${brand.email}`}><Button size="lg" variant="outline" className="h-12 px-6 bg-transparent border-foreground/10 text-foreground hover:bg-foreground/[0.06]">Contact sales</Button></a>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-foreground/50">
          <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-5"><div className="text-foreground/40 text-xs mb-1">EMAIL</div><div className="text-foreground">{brand.email}</div></div>
          <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-5"><div className="text-foreground/40 text-xs mb-1">PHONE</div><div className="text-foreground">{brand.phone}</div></div>
          <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-5"><div className="text-foreground/40 text-xs mb-1">HQ</div><div className="text-foreground">{brand.address}</div></div>
        </div>
      </div>
    </section>
  )
}

const FAQ = () => (
  <section id="faq" className="py-32 border-t border-foreground/5">
    <div className="max-w-3xl mx-auto px-6">
      <div className="text-center mb-12">
        <div className="text-xs uppercase tracking-widest text-foreground/40 mb-4">Questions</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-gradient">Frequently asked.</h2>
      </div>
      <Accordion type="single" collapsible className="space-y-2">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`i${i}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.02] px-5">
            <AccordionTrigger className="text-left hover:no-underline py-5 font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-foreground/60 pb-5">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
)

const Footer = () => {
  const { brand } = useBrand()
  return (
    <footer className="border-t border-foreground/5 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-6 items-center justify-between">
        <Logo />
        <div className="text-xs text-foreground/40">{brand.footer}</div>
        <div className="flex gap-6 text-xs text-foreground/50">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Security</a>
        </div>
      </div>
    </footer>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <LogoMarquee />
      <Features />
      <DashboardPreview />
      <Pricing />
      <Testimonials />
      <Contact />
      <FAQ />
      <Footer />
    </div>
  )
}

export default App
