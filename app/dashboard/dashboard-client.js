'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { MessageSquare, UserPlus, Database, QrCode } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid, OccupancyCard } from '@/components/zone-demand'
import { Card, Stat, formatTime, formatMoney } from '@/components/ui-kit'
import { UserAvatar } from '@/components/user-avatar'
import { OffPeakSMSModal } from '@/components/off-peak-sms-modal'
import { RecentActivityTimeline } from '@/components/recent-activity'
import { useLiveRefresh } from '@/components/use-live-refresh'
import { Button } from '@/components/ui/button'

const tooltipStyle = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }

export default function DashboardClient({ stats }) {
  const { brand } = useBrand()
  const [showSMS, setShowSMS] = useState(false)
  useLiveRefresh(20000)

  const sub = stats.subscription
  const symbol = stats.currencySymbol || '₹'
  const live = stats.live || []
  const weekly = stats.weeklyLine || []
  const hasWeekly = weekly.some(d => d.checkins > 0)
  const hasToday = (stats.dailyLine || []).some(d => d.v > 0)

  return (
    <DashShell title="Dashboard" subtitle="Live view of your gym">
      {sub && (
        <div className="mb-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-foreground/50">BGM subscription</div>
            <div className="font-display font-semibold mt-0.5 capitalize">
              {sub.currentPhase === 'Trial' ? 'Free trial' : String(sub.plan || '').replace(/-(monthly|annual)$/, '') || '—'}
              <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full align-middle ${sub.isReadOnly ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{sub.isReadOnly ? 'Expired' : sub.currentPhase}</span>
            </div>
            {!sub.isReadOnly && sub.daysRemaining !== null && <div className="text-xs text-foreground/50 mt-0.5">{sub.daysRemaining} day{sub.daysRemaining === 1 ? '' : 's'} remaining</div>}
          </div>
          <div className="md:w-72">
            <div className="flex justify-between text-xs mb-1.5"><span className="text-foreground/60">Members on plan</span><span className="font-semibold">{sub.activeMembers} / {sub.memberLimit >= 999999 ? 'Unlimited' : sub.memberLimit}</span></div>
            {sub.memberLimit < 999999 && <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${sub.usageProgressBar}%`, background: sub.usageProgressBar > 90 ? '#ef4444' : brand.primaryColor }} /></div>}
          </div>
          <Link href="/dashboard/subscription" className="text-sm font-medium hover:underline shrink-0" style={{ color: brand.primaryColor }}>Manage</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat label="Total members" value={stats.totalMembers ?? 0} />
        <Stat label="Active" value={stats.activeMembers ?? 0} hint={stats.pendingMembers ? `${stats.pendingMembers} awaiting approval` : null} />
        <Stat label="Expired" value={stats.expiredMembers ?? 0} hint={stats.expiringSoon ? `${stats.expiringSoon} expiring in 7 days` : null} tone={stats.expiredMembers ? '#f59e0b' : undefined} />
        <Stat label="Check-ins today" value={stats.todayCheckins ?? 0} hint={`${stats.todayUniqueMembers ?? 0} unique members`} />
        <Stat label="Revenue this month" value={formatMoney(stats.revenueMtdValue, symbol)} hint="Confirmed payments" />
        <Stat label="Outstanding dues" value={formatMoney(stats.outstandingTotal, symbol)} tone={stats.outstandingTotal > 0 ? '#f59e0b' : undefined} />
      </div>

      {stats.pendingMembers > 0 && (
        <Link href="/members" className="mt-4 block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <strong>{stats.pendingMembers}</strong> member{stats.pendingMembers === 1 ? '' : 's'} waiting for your review and approval →
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <OccupancyCard insideCount={stats.insideCount} capacity={stats.capacity} asOf={stats.asOf} />
        <Card className="lg:col-span-2" title="Live now on the floor" subtitle="Members with an open session" action={<Link href="/occupancy" className="text-xs text-foreground/50 hover:text-foreground">Live traffic →</Link>}>
          {live.length === 0 ? <div className="text-sm text-foreground/40 py-4">Nobody is checked in right now.</div> : (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {live.slice(0, 8).map(m => (
                <li key={m.id} className="flex items-center gap-3 min-w-0">
                  <UserAvatar src={m.member_photo} name={m.member_name} size={34} />
                  <div className="min-w-0 flex-1"><div className="text-sm truncate">{m.member_name}</div><div className="text-[11px] text-foreground/50 truncate">{m.workout.length ? m.workout.join(' + ') : 'No workout selected'}</div></div>
                  <div className="text-[11px] text-foreground/40 shrink-0">in {formatTime(m.check_in_time)}</div>
                </li>
              ))}
            </ul>
          )}
          {live.length > 8 && <div className="text-xs text-foreground/40 mt-3">+ {live.length - 8} more</div>}
        </Card>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between mb-2"><h2 className="text-sm font-semibold">Workout demand right now</h2><span className="text-xs text-foreground/40">Members present, by muscle group they chose</span></div>
        <ZoneDemandGrid zones={stats.zones} emptyHint="Add facilities under Settings → Facilities to see workout demand." />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Check-ins today" subtitle="Per hour, gym local time">
          {hasToday ? (
            <div className="h-56"><ResponsiveContainer>
              <AreaChart data={stats.dailyLine}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="hour" stroke="#88888880" fontSize={11} interval={2} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="v" name="Check-ins" stroke={brand.primaryColor} fill={brand.primaryColor} fillOpacity={0.2} strokeWidth={2} connectNulls={false} /></AreaChart>
            </ResponsiveContainer></div>
          ) : <div className="text-sm text-foreground/40 py-10 text-center">No check-ins yet today.</div>}
        </Card>
        <Card title="Last 7 days" subtitle="Check-ins and unique members per day">
          {hasWeekly ? (
            <div className="h-56"><ResponsiveContainer>
              <BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="day" stroke="#88888880" fontSize={11} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={28} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="checkins" name="Check-ins" fill={brand.primaryColor} radius={[4, 4, 0, 0]} /><Bar dataKey="unique" name="Unique members" fill="#737373" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer></div>
          ) : <div className="text-sm text-foreground/40 py-10 text-center">Attendance will appear after the first check-in.</div>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/members"><Button variant="outline" className="w-full h-11 justify-start"><UserPlus className="h-4 w-4 mr-2" />Members</Button></Link>
            <Link href="/settings?tab=attendance"><Button variant="outline" className="w-full h-11 justify-start"><QrCode className="h-4 w-4 mr-2" />Gym QR</Button></Link>
            <Link href="/dashboard/import"><Button variant="outline" className="w-full h-11 justify-start"><Database className="h-4 w-4 mr-2" />Import</Button></Link>
            <Button variant="outline" className="w-full h-11 justify-start" onClick={() => setShowSMS(true)}><MessageSquare className="h-4 w-4 mr-2" />Off-peak SMS</Button>
          </div>
        </Card>
        <div className="lg:col-span-2"><RecentActivityTimeline limit={8} /></div>
      </div>

      <OffPeakSMSModal open={showSMS} onOpenChange={setShowSMS} />
    </DashShell>
  )
}
