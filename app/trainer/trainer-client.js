'use client'
import Link from 'next/link'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'
import { Card, Stat, Empty, formatDate, formatTime } from '@/components/ui-kit'
import { UserAvatar } from '@/components/user-avatar'
import { useLiveRefresh } from '@/components/use-live-refresh'

export default function TrainerClient({ members, profile, live, logs }) {
  const { brand } = useBrand()
  useLiveRefresh(30000)
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: brand.timezone || 'Asia/Kolkata' })
  const inside = members.filter(m => m.checkedIn)
  const todayPlan = members.filter(m => !m.noFixedSchedule && (m.schedule?.[weekday] || []).length > 0)
  const expiring = members.filter(m => m.status === 'Active' && m.daysUntilExpiry !== null && m.daysUntilExpiry <= 7)

  return (
    <TrainerShell title={`Hi ${(profile?.name || 'Coach').split(' ')[0]}`} subtitle={profile?.gymName}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Assigned members" value={members.length} />
        <Stat label="In the gym now" value={inside.length} hint="of your members" />
        <Stat label="Training today" value={todayPlan.length} hint={`scheduled for ${weekday}`} />
        <Stat label="Gym occupancy" value={live.insideCount} hint={live.capacity ? `of ${live.capacity}` : 'members inside'} />
      </div>

      {members.length === 0 ? (
        <div className="mt-5"><Empty title="No members assigned yet" hint="When the gym owner assigns members to you, they appear here with their schedules and attendance." /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 mt-5">
          <Card title="Your members in the gym now">
            {inside.length === 0 ? <div className="text-sm text-foreground/40">None of your members is checked in right now.</div> : (
              <ul className="space-y-3">{inside.map(m => <li key={m.id} className="flex items-center gap-3"><UserAvatar src={m.photoURL} name={m.name} size={36} /><div className="min-w-0"><div className="text-sm truncate">{m.name}</div><div className="text-[11px] text-foreground/50">{(m.schedule?.[weekday] || []).join(' + ') || 'No plan for today'}</div></div></li>)}</ul>
            )}
          </Card>
          <Card title={`Scheduled for ${weekday}`} action={<Link href="/trainer/plans" className="text-xs text-foreground/50 hover:text-foreground">Edit schedules →</Link>}>
            {todayPlan.length === 0 ? <div className="text-sm text-foreground/40">No member has a workout scheduled today.</div> : (
              <ul className="space-y-2">{todayPlan.map(m => <li key={m.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{m.name}</span><span className="text-foreground/60 text-right">{m.schedule[weekday].join(' + ')}</span></li>)}</ul>
            )}
          </Card>
          <Card title="Recent check-ins" subtitle="Your members only">
            {logs.length === 0 ? <div className="text-sm text-foreground/40">No check-ins yet.</div> : (
              <ul className="space-y-2">{logs.slice(0, 8).map(l => <li key={l.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{l.members.name}</span><span className="text-foreground/50 shrink-0">{formatDate(l.check_in_time)} · {formatTime(l.check_in_time)}</span></li>)}</ul>
            )}
          </Card>
          <Card title="Memberships ending soon">
            {expiring.length === 0 ? <div className="text-sm text-foreground/40">None of your members expires in the next 7 days.</div> : (
              <ul className="space-y-2">{expiring.map(m => <li key={m.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{m.name}</span><span className="text-amber-400 shrink-0">{m.daysUntilExpiry} day{m.daysUntilExpiry === 1 ? '' : 's'}</span></li>)}</ul>
            )}
          </Card>
        </div>
      )}
    </TrainerShell>
  )
}
