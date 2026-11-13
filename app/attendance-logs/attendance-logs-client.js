'use client'
import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Empty, StatusBadge, formatDate, formatTime } from '@/components/ui-kit'
import { useLiveRefresh } from '@/components/use-live-refresh'

const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export default function AttendanceLogsClient({ initialLogs }) {
  const [q, setQ] = useState('')
  const [range, setRange] = useState('7')
  useLiveRefresh(30000)

  const logs = useMemo(() => {
    const since = range === 'all' ? 0 : Date.now() - Number(range) * 86400000
    const needle = q.trim().toLowerCase()
    return (initialLogs || []).filter(l => new Date(l.check_in_time).getTime() >= since && (!needle || l.members.name.toLowerCase().includes(needle)))
  }, [initialLogs, q, range])

  const exportCsv = () => {
    const rows = [['Member', 'Date', 'Check-in', 'Check-out', 'Duration (min)', 'Workout', 'Method', 'Status']]
    logs.forEach(l => rows.push([l.members.name, formatDate(l.check_in_time), formatTime(l.check_in_time), l.check_out_time ? formatTime(l.check_out_time) : '', l.duration_minutes ?? '', l.actual_workout.join(' + '), l.method || '', l.status]))
    const blob = new Blob([rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <DashShell title="Attendance" subtitle="Check-ins from the last 60 days" actions={<Button variant="outline" className="h-10" disabled={logs.length === 0} onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 h-11 flex-1"><Search className="h-4 w-4 text-foreground/40" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search member" className="bg-transparent outline-none text-base sm:text-sm flex-1 min-w-0" /></div>
        <select value={range} onChange={e => setRange(e.target.value)} className="h-11 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 text-sm"><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">Last 60 days</option></select>
      </div>
      {logs.length === 0 ? <Empty title="No attendance in this period" hint="Check-ins appear here as soon as members scan the gym QR code." /> : (
        <>
          <ul className="md:hidden space-y-2">
            {logs.map(l => (
              <li key={l.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
                <div className="flex justify-between gap-2"><span className="font-medium truncate">{l.members.name}</span><StatusBadge status={l.status === 'Active' ? 'Active' : 'COMPLETED'} /></div>
                <div className="text-xs text-foreground/50 mt-1">{formatDate(l.check_in_time)} · {formatTime(l.check_in_time)}{l.check_out_time ? ` → ${formatTime(l.check_out_time)}` : ''}{l.duration_minutes !== null ? ` · ${l.duration_minutes} min` : ''}</div>
                <div className="text-xs text-foreground/50">{l.actual_workout.join(' + ') || 'No workout selected'} · {l.method || '—'}</div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block rounded-2xl border border-foreground/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-widest text-foreground/40"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Workout</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-foreground/5">
                {logs.map(l => (
                  <tr key={l.id}><td className="px-4 py-2.5 font-medium">{l.members.name}</td><td className="px-4 py-2.5">{formatDate(l.check_in_time)}</td><td className="px-4 py-2.5">{formatTime(l.check_in_time)}</td><td className="px-4 py-2.5">{l.check_out_time ? formatTime(l.check_out_time) : '—'}</td><td className="px-4 py-2.5">{l.duration_minutes !== null ? `${l.duration_minutes} min` : '—'}</td><td className="px-4 py-2.5">{l.actual_workout.join(' + ') || '—'}</td><td className="px-4 py-2.5">{l.method || '—'}{l.method_out === 'Auto' ? ' (auto out)' : ''}</td><td className="px-4 py-2.5"><StatusBadge status={l.status === 'Active' ? 'Active' : 'COMPLETED'} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashShell>
  )
}
