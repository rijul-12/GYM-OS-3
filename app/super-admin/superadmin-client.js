'use client'
import Link from 'next/link'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Card, Stat, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { RecentActivityTimeline } from '@/components/recent-activity'

export default function SuperAdminClient({ gyms, analytics: a }) {
  const pending = gyms.filter(g => g.status === 'Pending')
  const recent = gyms.slice(0, 6)
  return (
    <SuperAdminShell title="Platform Overview" subtitle="BGM — all gyms">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Gyms" value={a.totalGyms} hint={`${a.activeGyms} active · ${a.pendingGyms} pending`} />
        <Stat label="On trial / paying" value={`${a.trialGyms} / ${a.paidGyms}`} />
        <Stat label="Members" value={a.totalMembers} hint={`${a.totalTrainers} trainers`} />
        <Stat label="Check-ins today" value={a.todayAttendance} />
        <Stat label="Collected this month" value={formatMoney(a.collectedThisMonth)} hint="Captured gym subscriptions" />
        <Stat label="Collected, 12 months" value={formatMoney(a.collectedLast12Months)} />
      </div>
      {pending.length > 0 && <Link href="/super-admin/gyms" className="mt-4 block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"><strong>{pending.length}</strong> gym{pending.length === 1 ? '' : 's'} waiting for approval →</Link>}
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Newest gyms" action={<Link href="/super-admin/gyms" className="text-xs text-foreground/50 hover:text-foreground">All gyms →</Link>}>
          {recent.length === 0 ? <div className="text-sm text-foreground/40">No gyms have registered yet.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">{recent.map(g => <li key={g.id} className="py-2.5 flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><div className="truncate font-medium">{g.name}</div><div className="text-[11px] text-foreground/50 truncate">{g.members} members · joined {formatDate(g.createdAt)}</div></div><StatusBadge status={g.status} /></li>)}</ul>
          )}
        </Card>
        <RecentActivityTimeline limit={8} />
      </div>
    </SuperAdminShell>
  )
}
