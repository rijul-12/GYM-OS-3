'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid, OccupancyCard } from '@/components/zone-demand'
import { Card, Stat, formatTime } from '@/components/ui-kit'
import { UserAvatar } from '@/components/user-avatar'
import { useLiveRefresh } from '@/components/use-live-refresh'
import { ownerCheckOutMember } from '@/actions/db/attendance'

export default function OccupancyClient({ stats }) {
  const { brand } = useBrand()
  const router = useRouter()
  const [pending, start] = useTransition()
  useLiveRefresh(15000)
  const live = stats.live || []
  const hasToday = (stats.hourly || []).some(d => d.v > 0)

  const checkout = (id, name) => start(async () => {
    const res = await ownerCheckOutMember(id)
    if (res?.error) toast.error(res.error)
    else { toast.success(`${name} checked out`); router.refresh() }
  })

  return (
    <DashShell title="Live Traffic" subtitle="Who is in the gym and what they are training">
      <div className="grid md:grid-cols-3 gap-4">
        <OccupancyCard insideCount={stats.insideCount} capacity={stats.capacity} asOf={stats.asOf} />
        <Stat label="Check-ins today" value={stats.todayCheckins} />
        <Stat label="Auto check-out after" value={stats.maxSessionMinutes ? `${Math.round(stats.maxSessionMinutes / 60 * 10) / 10} h` : '—'} hint="Change under Settings → Attendance" />
      </div>

      <div className="mt-5">
        <div className="mb-2">
          <h2 className="text-sm font-semibold">Workout demand</h2>
          <p className="text-xs text-foreground/50">How many of the members present chose each muscle group. A member training two groups counts once in each, and once in occupancy.</p>
        </div>
        <ZoneDemandGrid zones={stats.zones} emptyHint="Add facilities under Settings → Facilities." />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title={`On the floor (${live.length})`} subtitle="Open sessions">
          {live.length === 0 ? <div className="text-sm text-foreground/40 py-6 text-center">Nobody is checked in right now.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">
              {live.map(m => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <UserAvatar src={m.member_photo} name={m.member_name} size={36} />
                  <div className="min-w-0 flex-1"><div className="text-sm truncate">{m.member_name}</div><div className="text-[11px] text-foreground/50 truncate">{m.workout.length ? m.workout.join(' + ') : 'No workout selected'} · in at {formatTime(m.check_in_time)}{m.method ? ` · ${m.method}` : ''}</div></div>
                  <button disabled={pending} onClick={() => checkout(m.id, m.member_name)} className="text-xs px-2.5 py-1.5 rounded-lg border border-foreground/10 hover:bg-foreground/[0.06] disabled:opacity-50 shrink-0">Check out</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Check-ins today" subtitle="Per hour, gym local time">
          {hasToday ? (
            <div className="h-64"><ResponsiveContainer>
              <AreaChart data={stats.hourly}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="hour" stroke="#88888880" fontSize={11} interval={2} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="v" name="Check-ins" stroke={brand.primaryColor} fill={brand.primaryColor} fillOpacity={0.2} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer></div>
          ) : <div className="text-sm text-foreground/40 py-10 text-center">No check-ins yet today.</div>}
        </Card>
      </div>
    </DashShell>
  )
}
