'use client'
import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Upload, RotateCcw, Save, Eye } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Logo } from '@/components/logo'


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


const PRESETS = [
  { name: 'Signature Red', primary: '#ef4444', accent: '#f87171' },
  { name: 'Solar Orange', primary: '#f97316', accent: '#fb923c' },
  { name: 'Electric Blue', primary: '#3b82f6', accent: '#60a5fa' },
  { name: 'Emerald', primary: '#10b981', accent: '#34d399' },
  { name: 'Violet Luxe', primary: '#8b5cf6', accent: '#a78bfa' },
  { name: 'Midnight Gold', primary: '#eab308', accent: '#facc15' },
]

function App() {
  const { brand, setBrand, reset } = useBrand()
  const [local, setLocal] = useState(brand)

  const update = (patch) => setLocal((p) => ({ ...p, ...patch }))
  const save = () => {
    setBrand(local);
    toast.success('Branding settings applied to browser session!');
  }
  const doReset = () => {
    reset();
    window.location.reload();
  }

  return (
    <DashShell title="White Label" subtitle="Rebrand the entire platform in seconds — no code required"
      actions={<div className="flex gap-2"><Button onClick={doReset} variant="outline" className="bg-foreground/[0.03] border-foreground/10 h-10 text-xs"><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset</Button><Button onClick={save} style={{ background: local.primaryColor }} className="text-foreground border-0 h-10"><Save className="h-4 w-4 mr-2" /> Save changes</Button></div>}>
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            <div className="flex items-center gap-2 mb-1"><Palette className="h-4 w-4" style={{ color: local.primaryColor }} /><div className="text-sm font-medium">Identity</div></div>
            <div className="text-xs text-foreground/40 mb-5">Your gym name and logo</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-foreground/60">Gym name</Label>
                <Input value={local.gymName} onChange={(e) => update({ gymName: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
              <div>
                <Label className="text-xs text-foreground/60">Logo mark (single letter)</Label>
                <Input value={local.logoText} maxLength={2} onChange={(e) => update({ logoText: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs text-foreground/60">Favicon URL (optional)</Label>
              <Input value={local.favicon} onChange={(e) => update({ favicon: e.target.value })} placeholder="https://..." className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            <div className="text-sm font-medium mb-1">Theme colors</div>
            <div className="text-xs text-foreground/40 mb-5">Applied across the entire platform</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-foreground/60">Primary</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={local.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} className="h-10 w-14 rounded-lg border border-foreground/10 bg-transparent cursor-pointer" />
                  <Input value={local.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} className="flex-1 bg-foreground/[0.03] border-foreground/10 h-10 font-mono text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-foreground/60">Accent</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input type="color" value={local.accentColor} onChange={(e) => update({ accentColor: e.target.value })} className="h-10 w-14 rounded-lg border border-foreground/10 bg-transparent cursor-pointer" />
                  <Input value={local.accentColor} onChange={(e) => update({ accentColor: e.target.value })} className="flex-1 bg-foreground/[0.03] border-foreground/10 h-10 font-mono text-sm" />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="text-xs text-foreground/60 mb-2">Quick presets</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => update({ primaryColor: p.primary, accentColor: p.accent })} className="flex items-center gap-2 rounded-lg border border-foreground/5 bg-black/40 p-2.5 hover:border-foreground/20 transition">
                    <div className="h-5 w-5 rounded-md" style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }} />
                    <span className="text-xs">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            <div className="text-sm font-medium mb-1">Contact info</div>
            <div className="text-xs text-foreground/40 mb-5">Shown on landing page & footer</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-foreground/60">Phone</Label>
                <Input value={local.phone} onChange={(e) => update({ phone: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
              <div>
                <Label className="text-xs text-foreground/60">Email</Label>
                <Input value={local.email} onChange={(e) => update({ email: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-foreground/60">Address</Label>
                <Input value={local.address} onChange={(e) => update({ address: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            <div className="text-sm font-medium mb-1">Copy</div>
            <div className="text-xs text-foreground/40 mb-5">Banner & footer text</div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-foreground/60">Homepage banner</Label>
                <Textarea value={local.banner} onChange={(e) => update({ banner: e.target.value })} rows={2} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 resize-none" />
              </div>
              <div>
                <Label className="text-xs text-foreground/60">Footer text</Label>
                <Input value={local.footer} onChange={(e) => update({ footer: e.target.value })} className="mt-1.5 bg-foreground/[0.03] border-foreground/10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2 lg:sticky lg:top-24 self-start">
          <div className="flex items-center gap-2 mb-3"><Eye className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Live preview</div></div>
          <motion.div layout className="rounded-2xl border border-foreground/10 overflow-hidden shadow-2xl">
            <div className="relative h-40">
              <Image src={IMAGES.feature1} className="absolute inset-0 w-full h-full object-cover" alt="" width={120} height={120} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-foreground font-display" style={{ background: `linear-gradient(135deg, ${local.primaryColor}, ${local.accentColor})` }}>{local.logoText || local.gymName[0]}</div>
                <span className="font-display font-bold text-lg">{local.gymName}</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 font-display text-lg font-semibold leading-tight">{local.banner}</div>
            </div>
            <div className="p-5 bg-card space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[{ l: 'Members', v: '1,284' }, { l: 'Inside', v: '62' }, { l: 'Revenue', v: '₹45.9K' }].map((s, i) => (
                  <div key={i} className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-2.5">
                    <div className="text-[10px] text-foreground/40 uppercase">{s.l}</div>
                    <div className="font-display text-lg font-bold" style={i === 1 ? { color: local.primaryColor } : {}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <button className="w-full h-9 rounded-lg text-foreground text-sm font-medium" style={{ background: local.primaryColor }}>Get started</button>
              <div className="text-[10px] text-foreground/40 pt-2 border-t border-foreground/5">{local.footer}</div>
            </div>
          </motion.div>
          <div className="mt-4 text-xs text-foreground/40 leading-relaxed">
            Changes apply instantly across every screen. Click <span className="text-foreground">Save changes</span> to persist them for this browser session.
          </div>
        </div>
      </div>
    </DashShell>
  )
}

export default App
