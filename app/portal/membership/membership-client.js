'use client'
import Link from 'next/link'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { useBrand } from '@/components/brand-provider'
import { Card, StatusBadge, formatDate, formatMoney } from '@/components/ui-kit'

export default function MembershipClient({ plans, member }) {
  const { brand } = useBrand()
  if (!member) return <MemberMissing title="Membership" />
  const symbol = String(brand.currency || '₹').split(' ')[0]
  const left = member.daysUntilExpiry
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-2 text-sm border-b border-foreground/5 last:border-0"><span className="text-foreground/50">{k}</span><span className="text-right">{v}</span></div>

  return (
    <PortalShell title="Membership">
      <div className="space-y-4 max-w-3xl mx-auto">
        <Card title="Your membership" action={<StatusBadge status={member.status} />}>
          <div className="font-display text-2xl font-bold">{member.plan || 'No plan assigned yet'}</div>
          {member.status === 'Active' && left !== null && left <= 7 && <div className="text-sm text-amber-400 mt-1">Expires in {left} day{left === 1 ? '' : 's'} — renew at the front desk.</div>}
          {member.status === 'Expired' && <div className="text-sm text-red-400 mt-1">Expired on {formatDate(member.expiryDate)}. Renew at the front desk to check in again.</div>}
          {member.status === 'Pending' && <div className="text-sm text-amber-400 mt-1">Waiting for your gym to approve your membership.</div>}
          <div className="mt-4">
            <Row k="Start date" v={formatDate(member.startDate)} />
            <Row k="Expiry date" v={member.expiryDate ? formatDate(member.expiryDate) : 'No expiry'} />
            <Row k="Membership fee" v={formatMoney(member.paymentFee, symbol)} />
            <Row k="Paid" v={formatMoney(member.paymentAmount, symbol)} />
            <Row k="Outstanding" v={<span className={member.outstandingAmount > 0 ? 'text-amber-400 font-semibold' : ''}>{formatMoney(member.outstandingAmount, symbol)}</span>} />
            <Row k="Trainer" v={member.trainer_id ? member.trainer_name : 'Not assigned'} />
          </div>
          {member.outstandingAmount > 0 && <Link href="/portal/billing" className="mt-4 inline-flex h-11 items-center px-5 rounded-lg text-white text-sm font-medium" style={{ background: brand.primaryColor }}>Pay outstanding balance</Link>}
        </Card>

        <Card title={`Plans at ${member.gymName}`} subtitle="To change or renew your plan, speak to your gym.">
          {plans.length === 0 ? <div className="text-sm text-foreground/40">Your gym has not published its plans yet.</div> : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {plans.map(p => (
                <li key={p.id} className={`rounded-xl border p-4 ${p.name === member.plan ? '' : 'border-foreground/10'}`} style={p.name === member.plan ? { borderColor: brand.primaryColor } : undefined}>
                  <div className="flex justify-between gap-2"><span className="font-medium">{p.name}</span>{p.name === member.plan && <span className="text-[11px]" style={{ color: brand.primaryColor }}>Your plan</span>}</div>
                  <div className="font-display text-xl font-bold mt-1">{formatMoney(p.price, symbol)} <span className="text-xs font-normal text-foreground/50">/ {p.cycle}</span></div>
                  {p.features.length > 0 && <ul className="mt-2 text-xs text-foreground/60 space-y-0.5">{p.features.map(f => <li key={f}>• {f}</li>)}</ul>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PortalShell>
  )
}
