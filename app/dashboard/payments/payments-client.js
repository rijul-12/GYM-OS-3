'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Card, Stat, Empty, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { useLiveRefresh } from '@/components/use-live-refresh'
import { resolveUpiPayment } from '@/actions/db/member_payments'

export default function PaymentsClient({ transactions, symbol, options }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [filter, setFilter] = useState('All')
  useLiveRefresh(30000)

  const pendingTx = transactions.filter(t => t.status === 'PENDING_VERIFICATION')
  const month = new Date().toISOString().slice(0, 7)
  const paidThisMonth = transactions.filter(t => t.status === 'PAID' && String(t.resolved_at || t.created_at || '').slice(0, 7) === month).reduce((s, t) => s + t.amount, 0)
  const list = useMemo(() => transactions.filter(t => filter === 'All' || t.status === filter), [transactions, filter])

  const resolve = (tx, status) => start(async () => {
    const res = await resolveUpiPayment(tx.id, status)
    if (res?.error) toast.error(res.error)
    else { toast.success(status === 'PAID' ? `Payment from ${tx.memberName} confirmed` : 'Payment rejected'); router.refresh() }
  })

  return (
    <DashShell title="Payments" subtitle="Payments from your members">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Collected this month" value={formatMoney(paidThisMonth, symbol)} hint="Confirmed payments only" />
        <Stat label="Waiting for you" value={pendingTx.length} hint="UPI transfers to verify" tone={pendingTx.length ? '#f59e0b' : undefined} />
        <div className="col-span-2 md:col-span-1 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 text-xs text-foreground/60">
          <div className="text-[11px] uppercase tracking-widest text-foreground/50 mb-1">Member payment options</div>
          Direct UPI: <strong className="text-foreground">{options.upi ? 'On' : 'Off'}</strong> · Online (Razorpay): <strong className="text-foreground">{options.razorpay ? (options.razorpayConfigured ? 'On' : 'On — not configured by BGM yet') : 'Off'}</strong>
          <div className="mt-1"><Link href="/settings?tab=billing" className="underline">Change in Settings</Link></div>
        </div>
      </div>

      <Card className="mt-5" title="UPI payments to verify" subtitle="A member says they transferred this amount to your UPI ID. Check your bank or UPI app before confirming — BGM cannot see the transfer.">
        {pendingTx.length === 0 ? <div className="text-sm text-foreground/40">Nothing waiting for verification.</div> : (
          <ul className="divide-y divide-foreground/5 -my-2" data-testid="pending-upi">
            {pendingTx.map(tx => (
              <li key={tx.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{tx.memberName} · {formatMoney(tx.amount, symbol)}</div>
                  <div className="text-xs text-foreground/50">Reported {formatDate(tx.created_at)}{tx.utr ? ` · Ref ${tx.utr}` : ' · no reference given'}</div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={pending} variant="outline" className="flex-1 sm:flex-none h-10" onClick={() => resolve(tx, 'REJECTED')}>Not received</Button>
                  <Button disabled={pending} className="flex-1 sm:flex-none h-10 bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => resolve(tx, 'PAID')}>Confirm received</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5" title="Payment history" action={
        <select value={filter} onChange={e => setFilter(e.target.value)} className="h-9 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-2 text-xs"><option>All</option><option value="PAID">Paid</option><option value="PENDING_VERIFICATION">Pending</option><option value="REJECTED">Rejected</option><option value="REFUNDED">Refunded</option><option value="FAILED">Failed</option></select>}>
        {list.length === 0 ? <Empty title="No payments yet" hint="Payments you record for members, UPI confirmations and online payments appear here." /> : (
          <ul className="divide-y divide-foreground/5 -my-2">
            {list.slice(0, 200).map(tx => (
              <li key={tx.id} className="py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0"><div className="truncate">{tx.memberName}</div><div className="text-[11px] text-foreground/50">{formatDate(tx.resolved_at || tx.created_at)} · {tx.method}{tx.note ? ` · ${tx.note}` : ''}</div></div>
                <div className="text-right shrink-0"><div className="font-medium tabular-nums">{formatMoney(tx.amount, symbol)}</div><StatusBadge status={tx.status} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashShell>
  )
}
