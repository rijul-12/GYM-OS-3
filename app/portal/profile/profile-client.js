'use client'
import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Calendar, Phone, Mail, AlertCircle, Edit3, ChevronRight, Award } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'
import { Switch } from '@/components/ui/switch'




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
  const [prefs, setPrefs] = useState(NOTIFICATION_PREFS)
  const toggle = (id) => setPrefs(prefs.map(p => p.id === id ? { ...p, on: !p.on } : p))

  return (
    <PortalShell title="Profile">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
        <User className="h-3 w-3" /> Your profile
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Profile</h1>

      {/* Identity card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 rounded-3xl overflow-hidden border border-foreground/10" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}18, transparent 60%)` }}>
        <div className="p-6 md:p-8 flex items-center gap-5">
          <Image src={ME.photo} className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-2xl md:text-3xl font-bold tracking-tight">{ME.name}</div>
            <div className="text-sm text-foreground/60 mt-0.5">{ME.plan} · Member since {ME.joined}</div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${brand.primaryColor}20`, color: brand.primaryColor }}>{PERSONAL.goals}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-foreground/70">Coach: {PERSONAL.trainer}</span>
            </div>
          </div>
          <button className="hidden md:flex h-9 px-3 rounded-lg text-xs items-center gap-1.5 bg-foreground/[0.06] hover:bg-foreground/[0.12]">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </motion.div>

      {/* Workout schedule */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Workout schedule</h2></div>
        <p className="text-xs text-foreground/50 mb-5">Your weekly plan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCHEDULE.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-foreground/5 bg-black/30 p-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-display font-bold text-xs" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>{s.day}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.workout}</div>
                <div className="text-[10px] text-foreground/50">{s.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Personal details */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-5"><User className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Personal details</h2></div>
        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
          {[
            { l: 'Email', v: ME.email, icon: Mail },
            { l: 'Phone', v: ME.phone, icon: Phone },
            { l: 'Date of birth', v: PERSONAL.dob },
            { l: 'Height', v: PERSONAL.height },
            { l: 'Weight', v: PERSONAL.weight },
            { l: 'Blood type', v: PERSONAL.bloodType },
          ].map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              {d.icon && <d.icon className="h-4 w-4 text-foreground/40" />}
              <div className={d.icon ? '' : 'ml-7'}>
                <div className="text-[10px] uppercase text-foreground/40 tracking-widest">{d.l}</div>
                <div className="text-foreground">{d.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency contact */}
      <div className="mt-4 rounded-3xl border p-6" style={{ borderColor: 'rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-orange-400" />
          <h2 className="font-display font-semibold">Emergency contact</h2>
        </div>
        <div className="text-sm text-foreground/80">{ME.emergency}</div>
      </div>

      {/* Notification prefs */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Bell className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Notifications</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Choose what you get pinged about</p>
        <div className="divide-y divide-white/5">
          {prefs.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="flex-1 min-w-0 pr-4">
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-foreground/50 mt-0.5">{p.desc}</div>
              </div>
              <Switch checked={p.on} onCheckedChange={() => toggle(p.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-4"><Award className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Recent achievements</h2></div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: '6-day streak', emoji: '🔥' },
            { name: 'Bench PR', emoji: '🏆' },
            { name: '100 visits', emoji: '💪' },
          ].map((a, i) => (
            <div key={i} className="rounded-2xl border border-foreground/5 bg-black/30 p-4 text-center">
              <div className="text-3xl">{a.emoji}</div>
              <div className="text-xs mt-2 text-foreground/80">{a.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-foreground/40">
        <div>Signed in as {ME.email}</div>
        <a href="/" className="mt-2 inline-block hover:text-foreground">Sign out</a>
      </div>
    </PortalShell>
  )
}

export default App
