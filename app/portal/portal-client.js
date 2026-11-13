'use client'
import Link from 'next/link'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { SessionCard } from '@/components/session-card'
import { useBrand } from '@/components/brand-provider'
import { Card, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { OccupancyCard } from '@/components/zone-demand'
import { useLiveRefresh } from '@/components/use-live-refresh'

export default function PortalClient({ member, live }) {
  const { brand } = useBrand()
  useLiveRefresh(30000)
  if (!member) return <MemberMissing title="Home" />

  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: brand.timezone || 'Asia/Kolkata' })
  const planned = member.noFixedSchedule ? [] : (member.schedule?.[weekday] || [])
  const first = member.name.split(' ')[0]
  const status = member.status

  return (
    <PortalShell title="Home">
      <div className="space-y-4 max-w-3xl mx-auto">
        <div>
          <h2 className="font-display text-2xl font-bold">Hi {first}</h2>
          <p className="text-sm text-foreground/50">{member.gymName}</p>
        </div>

        {status !== 'Active' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm" data-testid="membership-alert">
            <div className="font-medium text-amber-400">
              {status === 'Pending' ? 'Your membership is waiting for approval' : status === 'Expired' ? 'Your membership has expired' : `Your membership is ${status.toLowerCase()}`}
            </div>
            <div className="text-foreground/60 mt-0.5">{status === 'Pending' ? 'Your gym will review your registration. You can check in once it is approved.' : 'Please contact your gym to continue checking in.'}</div>
          </div>
        )}

        <SessionCard session={member.activeSession} primaryColor={brand.primaryColor} />

        <Card title={`Today · ${weekday}`} action={<Link href="/portal/schedule" className="text-xs text-foreground/50 hover:text-foreground">Edit schedule →</Link>}>
          {member.noFixedSchedule ? (
            <p className="text-sm text-foreground/60">No fixed schedule — you choose your workout when you check in.</p>
          ) : planned.length ? (
            <div className="flex flex-wrap gap-2">{planned.map(g => <span key={g} className="text-sm px-3 py-1.5 rounded-lg text-white" style={{ background: brand.primaryColor }}>{g}</span>)}</div>
          ) : <p className="text-sm text-foreground/60">Rest day.</p>}
          {!member.activeSession && status === 'Active' && <p className="text-xs text-foreground/50 mt-3">To check in, scan the QR code at your gym&apos;s entrance with your phone camera.</p>}
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <OccupancyCard insideCount={live.insideCount} capacity={live.capacity} asOf={live.asOf} />
          <Card title="Membership" action={<StatusBadge status={status} />}>
            <div className="text-sm">{member.plan || 'No plan assigned yet'}</div>
            <div className="text-xs text-foreground/50 mt-1">{member.expiryDate ? `${status === 'Expired' ? 'Expired' : 'Valid until'} ${formatDate(member.expiryDate)}` : 'No expiry date'}</div>
            {member.outstandingAmount > 0 && <Link href="/portal/billing" className="mt-3 inline-block text-sm font-medium text-amber-400 hover:underline">{formatMoney(member.outstandingAmount)} due — pay now →</Link>}
            {member.trainer_id && <div className="text-xs text-foreground/50 mt-2">Trainer: {member.trainer_name}</div>}
          </Card>
        </div>
      </div>
    </PortalShell>
  )
}
