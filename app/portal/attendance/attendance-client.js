'use client'
import { motion } from 'framer-motion'
import { Calendar, Clock, Flame, TrendingUp, Trophy } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'





const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
  const MEMBER_INSIGHTS = stats?.insights || [];
  const SCHEDULE = [{ day: 'Today', workout: member?.workoutSplit || 'General Fitness', time: member?.preferredTime || 'Anytime' }];
  const NOTIFICATION_PREFS = [{ id: 'em', label: 'Email', on: true }, { id: 'pu', label: 'Push', on: true }];

  const { brand } = useBrand()
  const { year, month, today, days } = ATTENDANCE_CALENDAR

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const visited = Object.values(days).filter(d => d.visited).length
  const totalDuration = Object.values(days).reduce((s, d) => s + (d.duration || 0), 0)
  const avgSession = Math.round(totalDuration / visited)

  return (
    <PortalShell title="Attendance">

      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
        <Calendar className="h-3 w-3" /> Your visit history
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Attendance</h1>
      <p className="text-sm text-foreground/50 mt-1">{MONTHS[month]} {year} · {visited} visits so far</p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6">
        {[
          { label: 'Visits', value: visited, sub: 'this month', icon: Calendar },
          { label: 'Total time', value: `${Math.floor(totalDuration / 60)}h`, sub: `${totalDuration % 60}m`, icon: Clock },
          { label: 'Avg session', value: `${avgSession}m`, sub: 'per visit', icon: TrendingUp },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4">
            <s.icon className="h-4 w-4" style={{ color: brand.primaryColor }} />
            <div className="text-[10px] text-foreground/50 uppercase tracking-widest mt-2">{s.label}</div>
            <div className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-0.5">{s.value}</div>
            <div className="text-[10px] text-foreground/40">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Calendar */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-semibold">{MONTHS[month]}</div>
          <div className="flex items-center gap-3 text-[10px] text-foreground/50">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-white/10" /> Rest</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: `${brand.primaryColor}55` }} /> Light</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: brand.primaryColor }} /> Peak</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {DAYS.map((d, i) => <div key={i} className="text-[10px] uppercase text-foreground/40 py-1">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const day = days[d]
            const isToday = d === today
            const visited = day?.visited
            const intensity = day?.intensity ?? 0
            const bg = !visited ? 'rgba(255,255,255,0.04)' : `${brand.primaryColor}${Math.floor(30 + intensity * 70).toString(16).padStart(2, '0')}`
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: d * 0.008 }}
                className="aspect-square rounded-lg flex flex-col items-center justify-center relative"
                style={{ background: bg, border: isToday ? `1.5px solid ${brand.primaryColor}` : '1px solid rgba(255,255,255,0.05)' }}>
                <div className={`text-[11px] font-medium ${visited || isToday ? 'text-foreground' : 'text-foreground/40'}`}>{d}</div>
                {day?.duration ? <div className="text-[8px] text-foreground/70 font-mono">{day.duration}m</div> : null}
                {isToday && <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full pulse-red" style={{ background: brand.primaryColor }} />}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Workout history */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Previous workouts</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Your last 10 sessions</p>
        <div className="space-y-2">
          {WORKOUT_HISTORY.map((w, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={`flex items-center gap-4 p-3 rounded-2xl border ${w.stage === 'Rest' ? 'border-foreground/5 bg-foreground/[0.01]' : 'border-foreground/5 bg-black/30'}`}>
              <div className="text-center min-w-[44px]">
                <div className="text-[9px] text-foreground/40 uppercase">{new Date(w.date).toLocaleDateString('en', { weekday: 'short' })}</div>
                <div className="font-display text-lg font-bold">{new Date(w.date).getDate()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{w.workout}</div>
                {w.duration > 0 ? (
                  <div className="text-xs text-foreground/50 mt-0.5">{w.duration} min · {w.calories} cal{w.pr && <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${brand.primaryColor}22`, color: brand.primaryColor }}><Trophy className="h-2.5 w-2.5" /> PR: {w.pr}</span>}</div>
                ) : (
                  <div className="text-xs text-foreground/40 mt-0.5">Recovery day</div>
                )}
              </div>
              {w.duration > 0 && (
                <div className="text-right">
                  <div className="text-xs text-foreground/40">duration</div>
                  <div className="font-display text-lg font-bold tabular-nums">{Math.floor(w.duration / 60) || '0'}:{String(w.duration % 60).padStart(2, '0')}</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

export default App
