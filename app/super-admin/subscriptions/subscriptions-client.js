'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Card, Stat, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { approveSubscription, rejectSubscription } from '@/actions/db/subscriptions'

export default function SubscriptionsClient({ requests, gyms }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const now = Date.now()
  const trial = gyms.filter(g => g.subscriptionStatus === 'Trial' && g.trialEndDate && new Date(g.trialEndDate).getTime() > now)
  const paid = gyms.filter(g => g.subscriptionStatus === 'Active' && g.subscriptionExpiryDate && new Date(g.subscriptionExpiryDate).getTime() > now)
  const expired = gyms.filter(g => !trial.includes(g) && !paid.includes(g))
  const soon = [...trial.map(g => ({ g, end: g.trialEndDate })), ...paid.map(g => ({ g, end: g.subscriptionExpiryDate }))].filter(x => new Date(x.end).getTime() - now < 14 * 86400000).sort((a, b) => new Date(a.end) - new Date(b.end))
  const open = requests.filter(r => r.status === 'Pending')

  const act = (fn, ok) => start(async () => {
    const res = await fn()
    if (res?.error) toast.error(res.error); else { toast.success(ok); router.refresh() }
  })

  return (
    <SuperAdminShell title="Subscriptions" subtitle="What gyms pay BGM">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Paying gyms" value={paid.length} /><Stat label="On trial" value={trial.length} /><Stat label="Expired / none" value={expired.length} /><Stat label="Manual requests open" value={open.length} tone={open.length ? '#f59e0b' : undefined} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="Manual payment requests" subtitle="Bank/UPI transfers a gym reported to BGM. Verify the money before approving.">
          {requests.length === 0 ? <div className="text-sm text-foreground/40">No manual requests.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">{requests.map(r => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2"><span className="font-medium truncate">{r.gymName}</span><StatusBadge status={r.status} /></div>
                <div className="text-[11px] text-foreground/50">{r.plan} · {formatMoney(r.amount)} · ref {r.referenceNumber} · {formatDate(r.requestDate)}</div>
                {r.status === 'Pending' && <div className="mt-2 flex gap-2"><Button disabled={pending} className="h-9 text-xs" onClick={() => act(() => approveSubscription(r.id), 'Approved — 30 days added')}>Approve</Button><Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => act(() => rejectSubscription(r.id), 'Request rejected')}>Reject</Button></div>}
              </li>))}</ul>
          )}
        </Card>
        <Card title="Ending within 14 days">
          {soon.length === 0 ? <div className="text-sm text-foreground/40">Nothing ending soon.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">{soon.map(({ g, end }) => <li key={g.id} className="py-2.5 flex justify-between gap-3 text-sm"><span className="truncate">{g.name}</span><span className="text-foreground/50 shrink-0">{g.subscriptionStatus} · {formatDate(end)}</span></li>)}</ul>
          )}
        </Card>
      </div>
    </SuperAdminShell>
  )
}
