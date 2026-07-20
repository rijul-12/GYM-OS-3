'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Users, MapPin, Clock, Activity, Radio } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ZoneDemandGrid, CrowdHeatmap } from '@/components/zone-demand'
import { useBrand } from '@/components/brand-provider'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')
const MEMBER_STATUS = [
  { label: 'Warming up', color: '#f59e0b', desc: 'First 10 mins', count: 12 },
  { label: 'Active on floor', color: '#ef4444', desc: 'Heart rate peak', count: 30 },
  { label: 'Cooling down', color: '#3b82f6', desc: 'Trending to exit', count: 15 },
  { label: 'Recovery/Stretch', color: '#10b981', desc: 'Static > 5 mins', count: 5 }
]

export default function LiveClient({ stats, attendance, members }) {
  const { brand } = useBrand()
  const inside = attendance.length || 0;
  const capacity = 100;
  const occ = Math.round((inside / capacity) * 100) || 0;

  // Find members assigned to this trainer who are currently checked in natively
  const myInside = members.filter(m => attendance.some(a => a.member_id === m.id || a.memberId === m.id)).map(m => ({
    id: m.id,
    name: m.name || m.first_name + ' ' + m.last_name,
    photo: m.photo_url || `https://i.pravatar.cc/150?u=${m.email}`,
    checkedIn: true,
    stage: 'Floor',
    todayWorkout: m.workoutSplit || m.workout || 'General Fitness'
  }))

  return (
    <TrainerShell title="Live Gym" subtitle="Everything happening on the floor — your clients highlighted">

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 rounded-2xl border border-foreground/5 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl" style={{ background: `${brand.primaryColor}30` }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-foreground/50"><span className="h-2 w-2 rounded-full pulse-red" style={{ background: brand.primaryColor }} /> LIVE</div>
            <div className="mt-3 text-sm text-foreground/60">Members inside</div>
            <div className="font-display text-6xl font-bold tracking-tight mt-2">{inside}<span className="text-2xl text-foreground/40">/{capacity}</span></div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${occ}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }} />
              </div>
              <div className="text-sm font-semibold">{occ}%</div>
            </div>
            <div className="mt-4 rounded-lg bg-black/40 border border-foreground/5 p-3 flex items-center gap-3">
              <Users className="h-4 w-4" style={{ color: brand.primaryColor }} />
              <div className="flex-1 text-sm"><span className="text-foreground font-semibold">{myInside.length}</span> <span className="text-foreground/60">of your clients inside</span></div>
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Member workout stages</div></div>
          <div className="text-xs text-foreground/40 mb-4">Everyone on the floor — by current stage</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {MEMBER_STATUS.map((s) => {
              const max = Math.max(...MEMBER_STATUS.map(x => x.count))
              return (
                <div key={s.label} className="rounded-xl border border-foreground/5 bg-black/30 p-3">
                  <div className="flex justify-between items-baseline"><span className="text-sm font-medium">{s.label}</span><span className="text-foreground/50 font-mono text-xs">{s.count}</span></div>
                  <div className="text-[10px] text-foreground/40 mb-2">{s.desc}</div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / max) * 100}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: s.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Zone demand */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3"><MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Workout Zone Demand</div></div>
        <ZoneDemandGrid zones={stats?.zones} />
      </div>

      {/* Crowd heatmap */}
      <div className="mt-6 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Crowd Heatmap · Today</div></div>
        <div className="text-xs text-foreground/40 mb-4">Best window to schedule new sessions</div>
        <CrowdHeatmap overrideData={stats?.dailyLine} />
      </div>

      {/* Muscle distribution */}
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1"><Radio className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Muscle group snapshot</div></div>
          <div className="text-xs text-foreground/40 mb-3">What the whole gym is training</div>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats?.dist || []} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={3}>
                  {(stats?.dist || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-2">
            {(stats?.dist || []).map((w) => (
              <div key={w.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: w.color }} /> {w.name}</span>
                <span className="text-foreground/50">{w.value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Your clients inside now</div></div>
          <div className="text-xs text-foreground/40 mb-4">{myInside.length} of {members?.length || 0} training</div>
          <div className="space-y-2">
            {myInside.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-black/30 p-2.5">
                <Image src={m.photo} className="h-9 w-9 rounded-full object-cover" alt="" width={120} height={120} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{m.name}</div>
                  <div className="text-[10px] text-foreground/50 truncate">{m.todayWorkout}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${stageColor(m.stage)}18`, color: stageColor(m.stage) }}>{m.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TrainerShell>
  )
}

