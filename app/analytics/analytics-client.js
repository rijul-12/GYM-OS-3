'use client'
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Card, Stat, formatMoney } from '@/components/ui-kit'

const tip = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }
const monthLabel = (m) => new Date(`${m}-15T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
const NoData = ({ children = 'Not enough data yet.' }) => <div className="text-sm text-foreground/40 py-10 text-center">{children}</div>

export default function AnalyticsClient({ stats }) {
  const { brand } = useBrand()
  const m = stats.members || {}
  const a = stats.attendance || {}
  const r = stats.revenue || {}
  const sym = stats.currencySymbol || '₹'
  const c = brand.primaryColor
  const hasAttendance = (a.totalCheckins || 0) > 0
  const hasRevenue = (r.monthly || []).some(x => x.amount > 0)

  return (
    <DashShell title="Analytics" subtitle={`Calculated from your records${stats.timezone ? ` · ${stats.timezone}` : ''}`}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total members" value={m.total ?? 0} />
        <Stat label="Active" value={m.Active ?? 0} />
        <Stat label="Expired" value={m.Expired ?? 0} tone={m.Expired ? '#f59e0b' : undefined} />
        <Stat label="Pending approval" value={m.Pending ?? 0} />
        <Stat label="Revenue this month" value={formatMoney(r.thisMonth, sym)} hint="Confirmed payments" />
        <Stat label="Outstanding dues" value={formatMoney(m.outstandingTotal, sym)} hint={`${m.membersWithDues ?? 0} member${m.membersWithDues === 1 ? '' : 's'}`} />
        <Stat label="Check-ins (30 days)" value={a.totalCheckins ?? 0} hint={`${a.avgDailyCheckins ?? 0} per day on average`} />
        <Stat label="Avg. session" value={a.avgSessionMinutes ? `${a.avgSessionMinutes} min` : '—'} hint={a.avgSessionMinutes ? `From ${a.sessionsWithDuration} completed sessions` : 'Needs completed sessions'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Daily attendance" subtitle="Last 30 days · unique members per day">
          {hasAttendance ? <div className="h-60"><ResponsiveContainer><BarChart data={a.daily}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="date" tickFormatter={d => d.slice(8)} stroke="#88888880" fontSize={10} interval={3} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={tip} /><Bar dataKey="unique" name="Unique members" fill={c} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <NoData>No check-ins in the last 30 days.</NoData>}
        </Card>
        <Card title="Busiest hours" subtitle={a.peakHour !== null && a.peakHour !== undefined ? `Peak: ${a.hourly.find(h => h.hour === a.peakHour)?.label}` : 'Check-ins by hour, last 30 days'}>
          {hasAttendance ? <div className="h-60"><ResponsiveContainer><BarChart data={a.hourly}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="label" stroke="#88888880" fontSize={10} interval={2} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={tip} /><Bar dataKey="count" name="Check-ins" fill={c} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div> : <NoData />}
        </Card>
        <Card title="Membership trend" subtitle="Members over the last 6 months">
          {(m.total || 0) > 0 ? <div className="h-60"><ResponsiveContainer><LineChart data={m.growth}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="month" tickFormatter={monthLabel} stroke="#88888880" fontSize={11} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={32} /><Tooltip contentStyle={tip} labelFormatter={monthLabel} /><Line type="monotone" dataKey="total" name="Total members" stroke={c} strokeWidth={2} dot /><Line type="monotone" dataKey="joined" name="Joined that month" stroke="#a3a3a3" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div> : <NoData>Add members to see the trend.</NoData>}
        </Card>
        <Card title="Revenue" subtitle="Confirmed member payments per month">
          {hasRevenue ? <div className="h-60"><ResponsiveContainer><BarChart data={r.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="month" tickFormatter={monthLabel} stroke="#88888880" fontSize={11} /><YAxis stroke="#88888880" fontSize={11} width={48} /><Tooltip contentStyle={tip} labelFormatter={monthLabel} formatter={(v) => formatMoney(v, sym)} /><Bar dataKey="amount" name="Revenue" fill={c} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <NoData>No confirmed payments yet.</NoData>}
          {r.pendingVerification > 0 && <div className="text-xs text-amber-400 mt-2">{formatMoney(r.pendingVerification, sym)} in UPI payments is waiting for your verification and is not counted.</div>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <Card title="Workout demand" subtitle="Sessions per muscle group, last 30 days">
          {(stats.demand || []).some(d => d.sessions > 0) ? <ul className="space-y-2.5">{stats.demand.map(d => { const max = Math.max(...stats.demand.map(x => x.sessions), 1); return (<li key={d.name}><div className="flex justify-between text-sm"><span>{d.name}</span><span className="tabular-nums text-foreground/60">{d.sessions}</span></div><div className="h-1.5 rounded-full bg-foreground/10 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(d.sessions / max) * 100}%`, background: d.color }} /></div></li>) })}</ul> : <NoData />}
        </Card>
        <Card title="Most frequent members" subtitle="Visits in the last 30 days">
          {(a.topMembers || []).length ? <ol className="space-y-2">{a.topMembers.map((t, i) => <li key={t.id} className="flex justify-between text-sm"><span className="truncate">{i + 1}. {t.name}</span><span className="tabular-nums text-foreground/60 shrink-0">{t.visits}</span></li>)}</ol> : <NoData />}
          {a.activeMembers > 0 && <div className="text-xs text-foreground/50 mt-3">{a.activeMembersVisited} of {a.activeMembers} active members visited in the last 30 days.</div>}
        </Card>
        <Card title="Trainer activity" subtitle="Assigned members and their visits (30 days)">
          {(stats.trainers || []).length ? <ul className="space-y-2.5">{stats.trainers.map(t => <li key={t.id} className="text-sm"><div className="flex justify-between"><span className="truncate">{t.name}</span><span className="text-foreground/60 shrink-0">{t.assignedMembers} member{t.assignedMembers === 1 ? '' : 's'}</span></div><div className="text-[11px] text-foreground/40">{t.activeMembers} active · {t.memberVisits30d} visits</div></li>)}</ul> : <NoData>No trainers yet.</NoData>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Active members by plan">
          {(stats.plans || []).length ? <ul className="space-y-2">{stats.plans.map(p => <li key={p.name} className="flex justify-between text-sm"><span className="truncate">{p.name}</span><span className="tabular-nums text-foreground/60">{p.count}</span></li>)}</ul> : <NoData />}
        </Card>
        <Card title="This month by payment method">
          {(r.byMethod || []).length ? <ul className="space-y-2">{r.byMethod.map(p => <li key={p.method} className="flex justify-between text-sm"><span>{p.method}</span><span className="tabular-nums text-foreground/60">{formatMoney(p.amount, sym)}</span></li>)}</ul> : <NoData>No payments this month.</NoData>}
        </Card>
      </div>
    </DashShell>
  )
}
