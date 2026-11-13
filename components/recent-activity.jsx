'use client'
import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { getRecentActivity } from '@/actions/db/activity'

/** Audited actions for the owner's gym (or the platform, for a Super Admin). */
export function RecentActivityTimeline({ limit = 10 }) {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    let mounted = true
    getRecentActivity(null, limit).then(d => { if (mounted) setLogs(d || []) }).catch(() => { if (mounted) setLogs([]) })
    return () => { mounted = false }
  }, [limit])

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4"><Activity className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Recent activity</div></div>
      {logs === null ? (
        <div className="text-sm text-foreground/40">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-foreground/40">No activity recorded yet.</div>
      ) : (
        <ul className="space-y-3">
          {logs.map(l => (
            <li key={l.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate capitalize">{l.actionType}</div>
                <div className="text-[11px] text-foreground/40">{String(l.actorRole).replace('_', ' ')}{l.gymId ? '' : ''}</div>
              </div>
              <time className="text-[11px] text-foreground/40 shrink-0">{l.timestamp ? new Date(l.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
