'use client'
import { motion } from 'framer-motion'
import { Sparkles, Clock, Users, Timer, TrendingUp, HeartPulse } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'





const TONE = {
  positive: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.30)', label: 'Great' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.30)', label: 'Heads up' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', label: 'Avoid' },
  info: { color: '#a3a3a3', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', label: 'FYI' },
}

const ICONS = { mi1: Clock, mi2: Users, mi3: TrendingUp, mi4: Timer, mi5: Clock, mi6: HeartPulse }

function App({ member, globalAttendance, stats }) {
  // --- INJECTED PROPS ---
  const ME = {
    name: member?.name || "Member",
    plan: member?.plan || "Basic",
    joined: new Date(member?.created_at).toLocaleDateString() || 'Recently',
    email: member?.email || 'N/A',
    phone: member?.phone || 'N/A',
    emergency: member?.emergencyContact || 'Not provided',
    photo: member?.photo_url || `https://i.pravatar.cc/150?u=${member?.email}`
  };
  const PERSONAL = {
    dob: member?.dob || "N/A",
    height: (member?.bodyMeasurements?.height) + " cm" || "N/A",
    weight: (member?.bodyMeasurements?.weight) + " kg" || "N/A",
    bloodType: "N/A",
    goals: member?.goal || "General",
    trainer: member?.trainers?.name || "Unassigned"
  };
  const WORKOUT_HISTORY = member?.workout_logs ? member.workout_logs.map(w => ({ date: w.date_logged || new Date(), workout: w.workout_plan_name || 'Workout', duration: w.duration_minutes || parseInt(w.duration) || 45, calories: w.calories_burned || parseInt(w.calories) || 300, stage: 'Lifting' })) : [];
  const ATTENDANCE_CALENDAR = { year: new Date().getFullYear(), month: new Date().getMonth(), today: new Date().getDate(), days: {} };
  if (Array.isArray(member?.attendance)) {
    member.attendance.forEach(a => {
      const d = new Date(a.checkIn || a.check_in_time).getDate();
      ATTENDANCE_CALENDAR.days[d] = { visited: true, duration: 60, intensity: 1 };
    });
  }
  const MEMBER_INSIGHTS = stats?.insights ? stats.insights.map((ins, i) => ({
    id: 'mi' + (i + 1),
    tone: ins.action === "Hold Access" ? 'critical' : 'positive',
    label: ins.action || 'Note',
    confidence: ins.confidence || 85,
    title: 'Occupancy Trace',
    value: ins.title?.replace('Occupancy at', '') || 'Clear',
    detail: ins.detail
  })) : [];
  const SCHEDULE = [{ day: 'Today', workout: member?.workoutSplit || 'General Fitness', time: member?.preferredTime || 'Anytime' }];
  const NOTIFICATION_PREFS = [{ id: 'em', label: 'Email', on: true }, { id: 'pu', label: 'Push', on: true }];

  const { brand } = useBrand()

  return (
    <PortalShell title="AI Insights">

      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
        <Sparkles className="h-3 w-3" /> Personalized for you
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">AI Insights</h1>
      <p className="text-sm text-foreground/50 mt-1">Smart nudges to make every visit better.</p>

      <div className="grid md:grid-cols-2 gap-3 mt-6">
        {MEMBER_INSIGHTS.map((ins, i) => {
          const t = TONE[ins.tone]
          const Icon = ICONS[ins.id] || Sparkles
          return (
            <motion.div key={ins.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="relative rounded-3xl p-6 overflow-hidden card-hover" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-30" style={{ background: t.color }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}>
                    <Icon className="h-4 w-4" style={{ color: t.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${t.color}20`, color: t.color }}>{t.label}</span>
                    <span className="text-[10px] text-foreground/40 font-mono">{ins.confidence}%</span>
                  </div>
                </div>
                <div className="text-xs text-foreground/60 uppercase tracking-widest">{ins.title}</div>
                <div className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-2">{ins.value}</div>
                <div className="text-sm text-foreground/70 mt-3 leading-relaxed">{ins.detail}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${brand.primaryColor}20` }}>
          <Sparkles className="h-4 w-4" style={{ color: brand.primaryColor }} />
        </div>
        <div className="text-xs text-foreground/60 leading-relaxed">Insights update every few minutes based on real-time gym data, your visit history, and recovery signals from connected wearables.</div>
      </div>
    </PortalShell>
  )
}

export default App
