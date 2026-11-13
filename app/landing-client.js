'use client'
import { useState } from 'react'
import Link from 'next/link'
import { QrCode, Users, Activity, CreditCard, UserCog, Database, BarChart3, Bell, Palette, Sparkles, Menu, X, Check } from 'lucide-react'

const RED = '#ef4444'

const FEATURES = [
  { icon: QrCode, title: 'QR attendance', text: 'One QR code at your entrance. Members scan it with their phone camera, confirm today’s workout and are checked in.' },
  { icon: Activity, title: 'Live traffic & workout demand', text: 'See how many members are inside right now and which muscle groups they are training — per facility you define.' },
  { icon: Users, title: 'Members & memberships', text: 'Plans, start and expiry dates, renewals, dues and status in one place. Expired memberships cannot check in.' },
  { icon: CreditCard, title: 'Payments', text: 'Record cash at the desk, accept UPI transfers you verify yourself, or take online payments through Razorpay.' },
  { icon: UserCog, title: 'Trainers', text: 'Invite trainers, assign members and let them manage workout schedules and progress for their own members.' },
  { icon: Database, title: 'Bring your data', text: 'Import your existing members from CSV or Excel with column matching, validation and a full error report.' },
  { icon: BarChart3, title: 'Analytics', text: 'Attendance, revenue, membership trends and trainer activity, calculated from your own records.' },
  { icon: Bell, title: 'Notifications', text: 'In-app and e-mail alerts for approvals, payments to verify and memberships about to expire.' },
  { icon: Palette, title: 'White-label', text: 'Your gym’s name and colours across the member and trainer portals.' },
  { icon: Sparkles, title: 'GymAI', text: 'Personal insights for members, grounded in their real attendance — never invented.' },
]

const ROLES = [
  { title: 'Gym owners', text: 'Run members, trainers, attendance and payments from one dashboard.' },
  { title: 'Trainers', text: 'See only your assigned members, their schedules and their progress.' },
  { title: 'Members', text: 'Check in by QR, follow your workout schedule and track your membership and dues.' },
]

export default function LandingClient({ stats, publicGyms = [], pricing }) {
  const [open, setOpen] = useState(false)
  const [faq, setFaq] = useState(0)
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
  const FAQS = [
    { q: 'How does the free trial work?', a: 'Every new gym gets two months with all features. No card is needed to sign up. When the trial ends the account becomes read-only until you subscribe.' },
    { q: 'How is BGM priced?', a: `${inr(pricing.base)} per month plus ${inr(pricing.perMember)} per active paid member, and a one-time ${inr(pricing.registration)} registration fee with your first payment.` },
    { q: 'How does QR check-in work?', a: 'Your gym has one QR code that you print and display. It stays the same until you choose to regenerate it; the old code then stops working immediately.' },
    { q: 'How do members pay their gym?', a: 'You choose: record payments at the desk, enable direct UPI (you confirm each transfer after checking your account), or enable online payments through Razorpay, which are verified automatically.' },
    { q: 'Can I move from other gym software?', a: 'Yes. Export your members to CSV or Excel and use Bring Your Data. Nothing is saved until you review the preview and confirm.' },
    { q: 'Who can see my gym’s data?', a: 'Only you. Trainers see just the members assigned to them, and members see only their own profile, attendance and payments.' },
  ]
  const showStats = stats && stats.gyms >= 5

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-foreground/10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: RED }}>BGM</span>
            <span className="font-display font-bold tracking-tight">BGM <span className="hidden sm:inline font-normal text-foreground/50">· Best Gym Manager</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-foreground/70">
            <a href="#features" className="hover:text-foreground">Features</a><a href="#pricing" className="hover:text-foreground">Pricing</a><a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="h-10 px-4 inline-flex items-center rounded-lg text-sm border border-foreground/15 hover:bg-foreground/[0.05]">Sign in</Link>
            <Link href="/register" className="h-10 px-4 inline-flex items-center rounded-lg text-sm text-white font-medium" style={{ background: RED }}>Start free trial</Link>
          </div>
          <button className="md:hidden p-2.5 -mr-2 rounded-lg" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        {open && (
          <div className="md:hidden border-t border-foreground/10 px-4 py-3 space-y-1 text-sm">
            {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block py-2.5">{l}</a>)}
            <div className="grid grid-cols-2 gap-2 pt-2"><Link href="/login" className="h-11 inline-flex items-center justify-center rounded-lg border border-foreground/15">Sign in</Link><Link href="/register" className="h-11 inline-flex items-center justify-center rounded-lg text-white font-medium" style={{ background: RED }}>Start free trial</Link></div>
          </div>
        )}
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">BGM — Best Gym Manager</p>
          <h1 className="font-display font-bold tracking-tight text-4xl sm:text-6xl mt-4 leading-[1.05]">Your gym runs.<br /><span style={{ color: RED }}>BGM handles the rest.</span></h1>
          <p className="mt-5 text-base sm:text-lg text-foreground/60 max-w-2xl mx-auto">Memberships, QR attendance, live gym traffic, trainers and payments — one system for owners, trainers and members.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="h-12 px-6 inline-flex items-center justify-center rounded-xl text-white font-medium" style={{ background: RED }}>Start your 2-month free trial</Link>
            <Link href="/login" className="h-12 px-6 inline-flex items-center justify-center rounded-xl border border-foreground/15 hover:bg-foreground/[0.05]">Sign in</Link>
          </div>
          <p className="mt-3 text-xs text-foreground/40">No card required to start.</p>
          {showStats && (
            <dl className="mt-12 grid grid-cols-3 gap-4 max-w-xl mx-auto">
              {[['Gyms', stats.gyms], ['Members', stats.members], ['Check-ins', stats.checkins]].map(([l, v]) => <div key={l}><dd className="font-display text-2xl sm:text-3xl font-bold tabular-nums">{Number(v).toLocaleString('en-IN')}</dd><dt className="text-xs text-foreground/50">{l}</dt></div>)}
            </dl>
          )}
          {publicGyms.length > 0 && <p className="mt-8 text-xs text-foreground/40">Used by {publicGyms.slice(0, 6).join(' · ')}</p>}
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid sm:grid-cols-3 gap-4">
          {ROLES.map(r => <div key={r.title} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"><h3 className="font-display font-semibold">{r.title}</h3><p className="text-sm text-foreground/60 mt-1">{r.text}</p></div>)}
        </section>

        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">Everything your gym does, in one place</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
                <f.icon className="h-5 w-5" style={{ color: RED }} />
                <h3 className="font-display font-semibold mt-3">{f.title}</h3>
                <p className="text-sm text-foreground/60 mt-1">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">Simple pricing that grows with you</h2>
          <div className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-display text-4xl font-bold">{inr(pricing.base)}</span><span className="text-foreground/60">per month</span><span className="text-foreground/60">+ {inr(pricing.perMember)} per active paid member</span></div>
            <ul className="mt-6 space-y-2 text-sm text-foreground/70">
              {['2 months free — every feature included', 'No member limit: you pay for active paid members only', `One-time registration fee of ${inr(pricing.registration)} with your first payment`, 'Owner, trainer and member portals included', 'Cancel any time'].map(t => <li key={t} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: RED }} />{t}</li>)}
            </ul>
            <Link href="/register" className="mt-6 h-12 w-full inline-flex items-center justify-center rounded-xl text-white font-medium" style={{ background: RED }}>Start free trial</Link>
          </div>
        </section>

        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">Questions</h2>
          <div className="mt-8 divide-y divide-foreground/10 rounded-2xl border border-foreground/10">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button className="w-full text-left px-5 py-4 flex justify-between gap-4 font-medium" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}><span>{f.q}</span><span className="text-foreground/40">{faq === i ? '–' : '+'}</span></button>
                {faq === i && <p className="px-5 pb-4 text-sm text-foreground/60">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-6 justify-between text-sm pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <div><div className="font-display font-bold">BGM — Best Gym Manager</div><p className="text-foreground/50 mt-1">Your gym runs. BGM handles the rest.</p><p className="text-foreground/40 mt-3 text-xs">© {new Date().getFullYear()} BGM. All rights reserved.</p></div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-foreground/60">
            <Link href="/login" className="hover:text-foreground">Sign in</Link><Link href="/register" className="hover:text-foreground">Register</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/refund" className="hover:text-foreground">Refunds</Link><Link href="/security" className="hover:text-foreground">Security</Link>
            <Link href="/help" className="hover:text-foreground">Help</Link><a href="mailto:support@gymos.app" className="hover:text-foreground">support@gymos.app</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
