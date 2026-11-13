'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'
import { loadRazorpay } from '@/lib/razorpay-client'
import { createMemberPaymentOrder, verifyMemberPaymentSignature, submitDirectUpiPayment } from '@/actions/payments'

// Member → gym payment. Separate from the gym's own BGM subscription.
export default function BillingClient({ ctx }) {
  const { brand } = useBrand()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [utr, setUtr] = useState('')
  if (!ctx || ctx.error) return <MemberMissing title="Payments & Dues" />
  const symbol = String(brand.currency || '₹').split(' ')[0]
  const due = ctx.outstanding
  const noOptions = !ctx.upi.enabled && !ctx.razorpay.enabled

  const payOnline = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (!(await loadRazorpay())) { toast.error('The payment window could not be loaded. Check your connection.'); return }
      const order = await createMemberPaymentOrder()
      if (order.error) { toast.error(order.error); return }
      await new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key: order.keyId, amount: order.amountInPaise, currency: order.currency, order_id: order.orderId,
          name: brand.gymName, description: 'Membership dues',
          prefill: { name: ctx.name, email: ctx.email || undefined, contact: ctx.phone || undefined },
          theme: { color: brand.primaryColor }, modal: { ondismiss: resolve },
          handler: async (r) => {
            const tid = toast.loading('Confirming your payment…')
            try {
              const res = await verifyMemberPaymentSignature(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature)
              if (res.success) { toast.success('Payment confirmed. Thank you!', { id: tid }); router.refresh() }
              else if (res.pending) { toast.message('Payment received and being confirmed. Your balance will update shortly.', { id: tid }); router.refresh() }
              else toast.error(res.error || 'The payment could not be confirmed.', { id: tid })
            } catch { toast.error('We could not confirm the payment yet. If money was deducted your balance will update automatically.', { id: tid }) }
            resolve()
          },
        })
        rzp.on('payment.failed', (r) => toast.error(`Payment failed: ${r?.error?.description || 'please try again'}`))
        rzp.open()
      })
    } finally { setBusy(false) }
  }

  const reportUpi = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await submitDirectUpiPayment(utr)
      if (res.error) toast.error(res.error)
      else { toast.success('Sent to your gym for verification.'); setUtr(''); router.refresh() }
    } catch { toast.error('Network error. Nothing was submitted — please try again.') } finally { setBusy(false) }
  }

  return (
    <PortalShell title="Payments & Dues">
      <div className="space-y-4 max-w-2xl mx-auto">
        <Card>
          <div className="text-[11px] uppercase tracking-widest text-foreground/50">Outstanding balance</div>
          <div className="font-display text-4xl font-bold mt-1" data-testid="member-due">{formatMoney(due, symbol)}</div>
          {due === 0 && <div className="text-sm text-emerald-400 mt-1">You are all paid up.</div>}
          {ctx.pendingVerification && <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm px-3 py-2" data-testid="upi-pending">A UPI payment you reported is waiting for your gym to verify it. Your balance updates once they confirm.</div>}
        </Card>

        {due > 0 && (
          noOptions ? (
            <Card title="How to pay"><p className="text-sm text-foreground/60">Your gym collects payments at the front desk. Once they record your payment, your balance updates here.</p></Card>
          ) : (<>
            {ctx.razorpay.enabled && (
              <Card title="Pay online" subtitle="Card, UPI or net-banking. Confirmed automatically.">
                <Button disabled={busy} onClick={payOnline} className="w-full h-12 text-white border-0" style={{ background: brand.primaryColor }}>{busy ? 'Please wait…' : `Pay ${formatMoney(due, symbol)}`}</Button>
              </Card>
            )}
            {ctx.upi.enabled && (
              <Card title="Pay by UPI transfer" subtitle="Send the amount from any UPI app, then tell your gym.">
                <ol className="text-sm text-foreground/70 space-y-1 list-decimal pl-5 mb-3">
                  <li>Send exactly <strong className="text-foreground">{formatMoney(due, symbol)}</strong> to the UPI ID below.</li>
                  <li>Enter the transaction reference (UTR) from your UPI app.</li>
                  <li>Your gym checks their account and confirms the payment.</li>
                </ol>
                <div className="flex gap-2">
                  <input readOnly value={ctx.upi.upiId} className={`${inputClass} font-mono`} aria-label="Gym UPI ID" data-testid="gym-upi-id" />
                  <Button variant="outline" className="h-11 shrink-0" onClick={() => navigator.clipboard?.writeText(ctx.upi.upiId).then(() => toast.success('UPI ID copied'))}><Copy className="h-4 w-4" /></Button>
                </div>
                <a className="mt-2 inline-block text-sm underline sm:hidden" href={`upi://pay?pa=${encodeURIComponent(ctx.upi.upiId)}&pn=${encodeURIComponent(brand.gymName)}&am=${due}&cu=INR`}>Open my UPI app</a>
                <div className="mt-4"><Field label="UPI reference / UTR (recommended)" hint="Helps your gym find your payment."><input className={inputClass} value={utr} maxLength={30} inputMode="numeric" onChange={e => setUtr(e.target.value)} disabled={ctx.pendingVerification} /></Field></div>
                <Button variant="outline" disabled={busy || ctx.pendingVerification} onClick={reportUpi} className="w-full h-11 mt-3" data-testid="report-upi">{ctx.pendingVerification ? 'Waiting for your gym to verify' : busy ? 'Submitting…' : 'I have paid — notify my gym'}</Button>
                <p className="text-[11px] text-foreground/40 mt-2">Reporting a transfer does not mark it as paid. Only your gym can confirm it.</p>
              </Card>
            )}
          </>)
        )}

        <Card title="Payment history">
          {ctx.history.length === 0 ? <div className="text-sm text-foreground/40">No payments recorded yet.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">
              {ctx.history.map(h => (
                <li key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div><div>{formatDate(h.resolved_at || h.created_at)}</div><div className="text-[11px] text-foreground/50">{h.method}</div></div>
                  <div className="text-right"><div className="font-medium tabular-nums">{formatMoney(h.amount, symbol)}</div><StatusBadge status={h.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PortalShell>
  )
}
