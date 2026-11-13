'use client'
import { useMemo } from 'react'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { SessionCard } from '@/components/session-card'
import { useBrand } from '@/components/brand-provider'
import { Card, Stat, Empty, formatDate, formatTime } from '@/components/ui-kit'

export default function AttendanceClient({ member }) {
  const { brand } = useBrand()
  const tz = brand.timezone || 'Asia/Kolkata'
  const key = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz })
  const logs = member?.attendance || []

  const { days, monthCount, last30 } = useMemo(() => {
    const visited = new Set(logs.map(l => key(l.check_in_time)))
    const out = []
    for (let i = 34; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); out.push({ key: key(d), day: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz }), on: visited.has(key(d)) }) }
    const month = key(new Date()).slice(0, 7)
    return { days: out, monthCount: [...visited].filter(k => k.startsWith(month)).length, last30: out.slice(5).filter(d => d.on).length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, tz])

  if (!member) return <MemberMissing title="Attendance" />
  return (
    <PortalShell title="Attendance">
      <div className="space-y-4 max-w-3xl mx-auto">
        <SessionCard session={member.activeSession} primaryColor={brand.primaryColor} />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="This month" value={monthCount} hint="days" />
          <Stat label="Last 30 days" value={last30} hint="days" />
          <Stat label="All time" value={logs.length} hint="check-ins" />
        </div>
        <Card title="Last 5 weeks">
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(d => <div key={d.key} title={d.key} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] ${d.on ? 'text-white font-semibold' : 'bg-foreground/[0.05] text-foreground/40'}`} style={d.on ? { background: brand.primaryColor } : undefined}>{d.day}</div>)}
          </div>
        </Card>
        <Card title="History">
          {logs.length === 0 ? <Empty title="No check-ins yet" hint="Scan your gym's QR code to check in." /> : (
            <ul className="divide-y divide-foreground/5 -my-2">
              {logs.slice(0, 60).map(l => (
                <li key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0"><div>{formatDate(l.check_in_time)}</div><div className="text-[11px] text-foreground/50 truncate">{l.actual_workout.join(' + ') || 'No workout selected'}</div></div>
                  <div className="text-right text-xs text-foreground/60 shrink-0">{formatTime(l.check_in_time)}{l.check_out_time ? ` – ${formatTime(l.check_out_time)}` : ' – in progress'}{l.duration_minutes !== null && <div className="text-foreground/40">{l.duration_minutes} min</div>}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PortalShell>
  )
}
