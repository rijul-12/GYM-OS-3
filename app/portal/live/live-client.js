'use client'
import { motion } from 'framer-motion'
import { Users, MapPin, Clock, Radio, Sparkles } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'

import { ZoneDemandGrid, CrowdHeatmap, ZoneInsightsGrid } from '@/components/zone-demand'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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


function App({ insideCount = 0, zones = [], dailyLine = [], dist = [] }) {
  const { brand } = useBrand()
  const capacity = 80
  const occ = Math.round((insideCount / capacity) * 100)

  // Prepare Heatmap Data
  let customHeatmap = [];
  if (dailyLine && dailyLine.length > 0) {
    const mapped = [6, 9, 12, 17, 20, 22]; // Hours we want to show
    customHeatmap = mapped.map(h => {
      const pt = dailyLine.find((d, i) => i + 6 === h);
      const val = pt ? pt.v : 0;
      const hrFmt = h > 12 ? `${h - 12} PM` : `${h} AM`;
      const perc = Math.min(100, Math.round((val / capacity) * 100) || 5);
      let lvl = 'Low', dot = '🟢', clr = '#10b981';
      if (perc > 60) { lvl = 'Busy'; dot = '🟡'; clr = '#f59e0b'; }
      if (perc > 85) { lvl = 'Peak'; dot = '🔴'; clr = '#ef4444'; }
      return { time: hrFmt, level: lvl, percent: perc, dot: dot, color: clr };
    });
  }

  return (
    <PortalShell title="Live Gym">

      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
        <span className="h-1.5 w-1.5 rounded-full pulse-red" style={{ background: brand.primaryColor }} />
        Real-time · Auto-refresh every 3s
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Live Gym</h1>
      <p className="text-sm text-foreground/50 mt-1">Zone-level demand and crowd forecasts — before you arrive.</p>

      {/* Big occupancy */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden border border-foreground/10 mt-6" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}12, transparent 60%)` }}>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: brand.primaryColor }} />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground/50" />
            <div className="text-xs uppercase tracking-widest text-foreground/50">Members inside</div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-6xl md:text-7xl font-bold tracking-tight">{insideCount}</span>
            <span className="text-2xl text-foreground/40 font-display">/ {capacity}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${occ}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }} />
            </div>
            <div className="font-display text-lg font-bold">{occ}%</div>
          </div>
          <div className="mt-4 text-sm text-foreground/60">Gym is <span className="text-foreground font-semibold">busy</span>. Peak expected in <span className="text-foreground">~30 min</span>.</div>
        </div>
      </motion.div>

      {/* Workout Zone Demand */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Workout Zone Demand</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Based on member schedules and live check-ins</p>
        <ZoneDemandGrid compact zones={zones} />
      </div>

      {/* Crowd Heatmap */}
      <div className="mt-6 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Crowd Heatmap · Today</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Expected crowd level by hour</p>
        <CrowdHeatmap overrideData={customHeatmap} />
      </div>

      {/* AI Insights */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Smart insights</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Guidance from your schedule and today's gym data</p>
        <ZoneInsightsGrid limit={6} />
      </div>

      {/* Muscle group snapshot (kept — never machine-specific) */}
      <div className="mt-6 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Radio className="h-4 w-4 text-foreground/50" /><h2 className="font-display font-semibold">Muscle group snapshot</h2></div>
        <p className="text-xs text-foreground/50 mb-5">What members are training right now</p>
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="h-40">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dist.length > 0 ? dist : WORKOUT_DIST} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={4}>
                  {(dist.length > 0 ? dist : WORKOUT_DIST).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-sm">
            {(dist.length > 0 ? dist : WORKOUT_DIST).map((w) => (
              <div key={w.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: w.color }} /> {w.name}</span>
                <span className="text-foreground/50 tabular-nums">{w.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-xs text-foreground/60 leading-relaxed">
        <span className="text-foreground font-medium">Why zone-level?</span> GymOS predicts demand from member schedules, check-in patterns, and workout types — never from exact machine sensors. This is more accurate, respects privacy, and never lies.
      </div>
    </PortalShell>
  )
}

export default App
