'use client'
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Card, Stat, formatMoney } from '@/components/ui-kit'

const monthLabel = (m) => new Date(`${m}-15T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })

export default function AnalyticsClient({ gyms, analytics: a }) {
  const signups = {}
  ;(a.monthly || []).forEach(m => { signups[m.month] = 0 })
  gyms.forEach(g => { const k = String(g.createdAt || '').slice(0, 7); if (k in signups) signups[k]++ })
  const growth = Object.entries(signups).map(([month, count]) => ({ month, count }))
  const cities = Object.entries(gyms.reduce((acc, g) => { const c = (g.city || 'Unknown').replace(/\b\w/g, x => x.toUpperCase()); acc[c] = (acc[c] || 0) + 1; return acc }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8)
  const top = [...gyms].sort((x, y) => y.members - x.members).slice(0, 8)
  const hasRevenue = (a.monthly || []).some(m => m.revenue > 0)
  const tip = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }

  return (
    <SuperAdminShell title="Platform Analytics" subtitle="Calculated from platform records">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Gyms" value={a.totalGyms} /><Stat label="Members" value={a.totalMembers} /><Stat label="Trainers" value={a.totalTrainers} /><Stat label="Check-ins today" value={a.todayAttendance} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Subscription revenue" subtitle="Captured gym payments per month">
          {hasRevenue ? <div className="h-60"><ResponsiveContainer><BarChart data={a.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="month" tickFormatter={monthLabel} stroke="#88888880" fontSize={11} /><YAxis stroke="#88888880" fontSize={11} width={48} /><Tooltip contentStyle={tip} labelFormatter={monthLabel} formatter={v => formatMoney(v)} /><Bar dataKey="revenue" name="Revenue" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="text-sm text-foreground/40 py-10 text-center">No captured payments yet.</div>}
        </Card>
        <Card title="New gyms" subtitle="Registrations per month">
          {gyms.length ? <div className="h-60"><ResponsiveContainer><BarChart data={growth}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="month" tickFormatter={monthLabel} stroke="#88888880" fontSize={11} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={tip} labelFormatter={monthLabel} /><Bar dataKey="count" name="Gyms" fill="#a3a3a3" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="text-sm text-foreground/40 py-10 text-center">No gyms yet.</div>}
        </Card>
        <Card title="Largest gyms" subtitle="By member count">{top.length ? <ol className="space-y-2 text-sm">{top.map((g, i) => <li key={g.id} className="flex justify-between gap-3"><span className="truncate">{i + 1}. {g.name}</span><span className="text-foreground/60 tabular-nums">{g.members}</span></li>)}</ol> : <div className="text-sm text-foreground/40">No gyms yet.</div>}</Card>
        <Card title="Gyms by city">{cities.length ? <ul className="space-y-2 text-sm">{cities.map(([c, n]) => <li key={c} className="flex justify-between gap-3"><span className="truncate">{c}</span><span className="text-foreground/60 tabular-nums">{n}</span></li>)}</ul> : <div className="text-sm text-foreground/40">No gyms yet.</div>}</Card>
      </div>
    </SuperAdminShell>
  )
}
