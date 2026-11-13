'use client'

/**
 * Workout demand per facility: how many of the members currently in the gym
 * chose that muscle group. A percentage is shown only when the owner set a
 * capacity for the zone — otherwise just the head-count.
 */
export function ZoneDemandGrid({ zones = [], compact = false, emptyHint = 'No facilities are configured yet.' }) {
  if (!zones || zones.length === 0) {
    return <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 text-center text-sm text-foreground/50">{emptyHint}</div>
  }
  return (
    <div className={`grid gap-3 grid-cols-2 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-6'}`} data-testid="zone-grid">
      {zones.map((z) => {
        const pct = typeof z.demand === 'number' ? Math.min(100, z.demand) : null
        return (
          <div key={z.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 min-w-0" data-zone={z.muscleGroup}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xl leading-none" aria-hidden>{z.emoji}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full truncate" style={{ background: `${z.color}22`, color: z.color }}>{z.status}</span>
            </div>
            <div className="mt-3 font-display font-semibold text-sm truncate">{z.name}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums" data-testid="zone-count">{z.members}</span>
              <span className="text-xs text-foreground/50">{z.capacity ? `of ${z.capacity}` : (z.members === 1 ? 'member' : 'members')}</span>
            </div>
            {pct !== null && (
              <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: z.color }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Unique members currently checked in, against capacity when the owner configured one. */
export function OccupancyCard({ insideCount = 0, capacity = null, asOf = null }) {
  const pct = capacity ? Math.min(100, Math.round((insideCount / capacity) * 100)) : null
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
      <div className="text-[11px] uppercase tracking-widest text-foreground/50">In the gym right now</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tabular-nums" data-testid="inside-count">{insideCount}</span>
        <span className="text-sm text-foreground/50">{capacity ? `of ${capacity} capacity` : (insideCount === 1 ? 'member' : 'members')}</span>
      </div>
      {pct !== null && (
        <div className="mt-3 h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e' }} />
        </div>
      )}
      <div className="mt-2 text-[11px] text-foreground/40">
        Unique members checked in{asOf ? ` · updated ${new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </div>
    </div>
  )
}
