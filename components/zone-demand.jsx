'use client'
import { motion } from 'framer-motion'

const ZONES = [
  { name: 'Cardio', demand: 85, trend: '+5%', color: '#ef4444' },
  { name: 'Strength', demand: 92, trend: '+12%', color: '#3b82f6' }
]
const CROWD_HEATMAP = Array(7).fill(0).map(() => Array(24).fill(Math.random() * 100))
const ZONE_INSIGHTS = []
// -------- Workout Zone Demand Grid --------
export function ZoneDemandGrid({ compact = false, zones = ZONES }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
      {zones.map((z, i) => (
        <motion.div
          key={z.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="relative rounded-2xl border p-4 overflow-hidden card-hover"
          style={{ borderColor: z.border, background: z.bg }}
        >
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40" style={{ background: z.color }} />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="text-2xl">{z.emoji}</div>
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${z.color}25`, color: z.color }}>{z.status}</span>
            </div>
            <div className="mt-3 font-display font-semibold text-sm md:text-base">{z.name}</div>
            <div className="mt-1 text-xs text-white/50">{z.members} members</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${z.demand}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.05 + 0.15 }}
                  className="h-full rounded-full"
                  style={{ background: z.color }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: z.color }}>{z.demand}%</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// -------- Crowd Heatmap Horizontal Timeline --------
export function CrowdHeatmap() {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
      {CROWD_HEATMAP.map((h, i) => (
        <motion.div
          key={h.time}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative shrink-0 min-w-[110px] md:flex-1 rounded-2xl border p-4 overflow-hidden"
          style={{ borderColor: `${h.color}45`, background: `linear-gradient(180deg, ${h.color}18, transparent 90%)` }}
        >
          <div className="text-xs uppercase tracking-widest font-semibold text-white/60">{h.time}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-base">{h.dot}</span>
            <span className="font-display text-sm md:text-base font-bold" style={{ color: h.color }}>{h.level}</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${h.percent}%` }} transition={{ duration: 1.1, delay: i * 0.06 + 0.1 }} className="h-full rounded-full" style={{ background: h.color }} />
          </div>
          <div className="mt-2 text-[10px] text-white/50 tabular-nums">{h.percent}% capacity</div>
        </motion.div>
      ))}
    </div>
  )
}

// -------- Zone AI Insights Grid --------
const TONE = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.35)' },
  positive: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.30)' },
  info: { color: '#a3a3a3', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' },
}

export function ZoneInsightsGrid({ limit = 6 }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {ZONE_INSIGHTS.slice(0, limit).map((ins, i) => {
        const t = TONE[ins.tone]
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-5 relative overflow-hidden card-hover"
            style={{ background: t.bg, border: `1px solid ${t.border}` }}
          >
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-30" style={{ background: t.color }} />
            <div className="relative">
              <div className="text-2xl leading-none">{ins.icon}</div>
              <div className="mt-3 font-display font-semibold leading-snug">{ins.text}</div>
              <div className="text-xs text-white/55 mt-2">{ins.hint}</div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
