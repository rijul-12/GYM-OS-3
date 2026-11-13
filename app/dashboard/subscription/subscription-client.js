'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { loadRazorpay } from '@/lib/razorpay-client'
import { createRazorpayOrder, verifyPaymentSignature } from '@/actions/payments'

// Gym → BGM payment. Completely separate from member → gym payments.
export default function SubscriptionClient({ status, cost, history, razorpay, owner }) {
  const { brand } = useBrand()
  const { refresh } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const firstPayment = !status?.registrationFeePaid
  const dueNow = (cost?.totalCost || 0) + (firstPayment ? (cost?.registrationFee || 0) : 0)
  const endDate = status?.currentPhase === 'Trial' ? status.trialEndDate : status?.subscriptionExpiryDate

  const pay = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (!(await loadRazorpay())) { toast.error('The payment window could not be loaded. Check your connection.'); return }
      const order = await createRazorpayOrder('usage-v1')
      if (order.error || !order.orderId) { toast.error(order.error || 'Could not start the payment.'); return }

      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amountInPaise, currency: order.currency, order_id: order.orderId,
          name: 'BGM — Best Gym Manager', description: 'BGM subscription',
          prefill: { name: owner.name || '', email: owner.email || '' },
          theme: { color: '#ef4444' },
          modal: { ondismiss: resolve },
          handler: async (response) => {
            const tid = toast.loading('Confirming your payment…')
            try {
              const res = await verifyPaymentSignature(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature)
              if (res.success) { toast.success('Payment confirmed. Your subscription is active.', { id: tid }); await refresh(); router.refresh() }
              else if (res.pending) toast.message('Payment received and being confirmed. This page will update shortly.', { id: tid })
              else toast.error(res.error || 'The payment could not be confirmed.', { id: tid })
            } catch { toast.error('We could not confirm the payment. If money was deducted it will be reconciled automatically.', { id: tid }) }
            resolve()
          },
        })
        rzp.on('payment.failed', (r) => toast.error(`Payment failed: ${r?.error?.description || 'please try again'}`))
        rzp.open()
      })
    } finally { setBusy(false) }
  }

  return (
    <DashShell title="BGM Subscription" subtitle="What your gym pays BGM">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" title="Current status">
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-display text-2xl font-bold">{status?.currentPhase === 'Trial' ? 'Free trial' : status?.currentPhase === 'Active' ? 'Active' : 'Expired'}</div>
            <StatusBadge status={status?.isReadOnly ? 'Expired' : status?.currentPhase} />
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
            <div><dt className="text-[11px] uppercase tracking-widest text-foreground/40">{status?.isReadOnly ? 'Ended' : 'Valid until'}</dt><dd className="font-medium">{endDate ? formatDate(endDate) : '—'}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-widest text-foreground/40">Days remaining</dt><dd className="font-medium">{status?.isReadOnly ? 0 : status?.daysRemaining ?? '—'}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-widest text-foreground/40">Members counted</dt><dd className="font-medium">{status?.activeMembers ?? 0}</dd></div>
          </dl>
          {status?.isReadOnly && <p className="mt-4 text-sm text-red-400">Your account is read-only. Renew to add members, record payments and edit settings again. Check-ins keep working for active members.</p>}
        </Card>
        <Card title="Pay now">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-foreground/60">Platform fee</span><span>{formatMoney(cost.baseFee)}</span></div>
            <div className="flex justify-between"><span className="text-foreground/60">{cost.activePaidMembers} active member{cost.activePaidMembers === 1 ? '' : 's'} × {formatMoney(cost.rate)}</span><span>{formatMoney(cost.usageCost)}</span></div>
            {firstPayment && <div className="flex justify-between"><span className="text-foreground/60">One-time registration fee</span><span>{formatMoney(cost.registrationFee)}</span></div>}
            <div className="flex justify-between font-semibold border-t border-foreground/10 pt-2"><span>Total for 1 month</span><span data-testid="bgm-total">{formatMoney(dueNow)}</span></div>
          </div>
          {razorpay.configured ? (
            <Button disabled={busy} onClick={pay} className="w-full mt-4 h-11 text-white border-0" style={{ background: brand.primaryColor }}>{busy ? 'Opening payment…' : status?.currentPhase === 'Active' ? 'Renew for 1 month' : 'Activate subscription'}</Button>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs p-3">Online payment is not available yet — BGM has not finished payment setup. Contact support@gymos.app to renew.</div>
          )}
          <p className="text-[11px] text-foreground/40 mt-2">The amount is calculated by BGM at payment time. Paying while active extends your current period.</p>
        </Card>
      </div>

      <Card className="mt-5" title="Payment history">
        {history.length === 0 ? <div className="text-sm text-foreground/40">No payments yet.</div> : (
          <ul className="divide-y divide-foreground/5 -my-2">
            {history.map(h => (
              <li key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0"><div className="truncate">{formatDate(h.date)}</div><div className="text-[11px] text-foreground/40 font-mono truncate">{h.id}</div></div>
                <div className="text-right shrink-0"><div className="font-medium">{formatMoney(h.amount)}</div><StatusBadge status={h.status === 'captured' ? 'PAID' : h.status === 'refunded' ? 'REFUNDED' : h.status} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashShell>
  )
}
