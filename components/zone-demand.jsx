import { motion } from 'framer-motion'
import { EmptyState } from '@/components/ui/empty-state'

// -------- Workout Zone Demand Grid --------
export function ZoneDemandGrid({ compact = false, zones = [] }) {
  if (!zones || zones.length === 0) {
    return <EmptyState title="No Zone Telemetry" description="No active physical zone metrics derived from live floor tracking yet." />
  }

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
      {zones.map((z, i) => (
        <motion.div
          key={z.id || i}
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
            <div className="mt-1 text-xs text-foreground/50">{z.members} members</div>
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
export function CrowdHeatmap({ heatmapData = [] }) {
  if (!heatmapData || heatmapData.length === 0) {
    return <EmptyState title="Heatmap Unavailable" description="Prediction engine requires at least 24 hours of live check-in data." />
  }

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
      {heatmapData.map((h, i) => (
        <motion.div
          key={h.time || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative shrink-0 min-w-[110px] md:flex-1 rounded-2xl border p-4 overflow-hidden"
          style={{ borderColor: `${h.color}45`, background: `linear-gradient(180deg, ${h.color}18, transparent 90%)` }}
        >
          <div className="text-xs uppercase tracking-widest font-semibold text-foreground/60">{h.time}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-base">{h.dot}</span>
            <span className="font-display text-sm md:text-base font-bold" style={{ color: h.color }}>{h.level}</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${h.percent}%` }} transition={{ duration: 1.1, delay: i * 0.06 + 0.1 }} className="h-full rounded-full" style={{ background: h.color }} />
          </div>
          <div className="mt-2 text-[10px] text-foreground/50 tabular-nums">{h.percent}% capacity</div>
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

export function ZoneInsightsGrid({ insights = [], limit = 6 }) {
  if (!insights || insights.length === 0) {
    return <EmptyState title="No Insights Detected" description="Physical zone ML models currently have no real-time telemetry to analyze." />
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.slice(0, limit).map((ins, i) => {
        const t = TONE[ins.tone] || TONE.info
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
              <div className="text-2xl leading-none">{ins.icon || '✨'}</div>
              <div className="mt-3 font-display font-semibold leading-snug">{ins.title || ins.text}</div>
              <div className="text-xs text-foreground/55 mt-2">{ins.detail || ins.hint}</div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

