'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Modal, Field, inputClass, Empty, formatMoney } from '@/components/ui-kit'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { createPlan, updatePlan, deletePlan } from '@/actions/db/plans'

const CYCLES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']

export default function PlansClient({ initialPlans }) {
  const router = useRouter()
  const { brand } = useBrand()
  const { user } = useAuth()
  const [pending, start] = useTransition()
  const [dialog, setDialog] = useState(null)
  const plans = initialPlans || []
  const readOnly = !!user?.readOnly
  const symbol = String(brand.currency || '₹').split(' ')[0]

  const run = (fn, ok) => start(async () => {
    try {
      const res = await fn()
      if (!res || res.error) { toast.error(res?.error || 'The action failed.'); return }
      toast.success(ok); setDialog(null); router.refresh()
    } catch { toast.error('Network error. Please try again.') }
  })

  return (
    <DashShell title="Membership Plans" subtitle="The plans you sell to members"
      actions={!readOnly && <Button onClick={() => setDialog({ type: 'form' })} style={{ background: brand.primaryColor }} className="text-white border-0 h-10"><Plus className="h-4 w-4 mr-2" />New plan</Button>}>
      {plans.length === 0 ? <Empty title="No plans yet" hint="Create your first membership plan — its price and duration are used when you add or renew members." /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 flex flex-col" style={p.popular ? { borderColor: `${p.color}80` } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="font-display font-semibold text-lg truncate">{p.name}</div><div className="text-xs text-foreground/50">{p.cycle}</div></div>
                {p.popular && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${p.color}25`, color: p.color }}>Popular</span>}
              </div>
              <div className="mt-3 font-display text-3xl font-bold">{formatMoney(p.price, symbol)}</div>
              <div className="text-xs text-foreground/50 mt-1">{p.members} member{p.members === 1 ? '' : 's'} on this plan</div>
              {p.features.length > 0 && <ul className="mt-3 space-y-1 text-sm text-foreground/70 flex-1">{p.features.map(f => <li key={f}>• {f}</li>)}</ul>}
              {!readOnly && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="h-9 text-xs flex-1" onClick={() => setDialog({ type: 'form', plan: p })}>Edit</Button>
                  <Button variant="outline" className="h-9 text-xs text-red-400" disabled={pending} onClick={() => setDialog({ type: 'delete', plan: p })}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {dialog?.type === 'form' && <PlanForm plan={dialog.plan} pending={pending} onClose={() => setDialog(null)} onSave={(f) => run(() => dialog.plan ? updatePlan(dialog.plan.id, f) : createPlan(f), dialog.plan ? 'Plan updated' : 'Plan created')} />}
      {dialog?.type === 'delete' && (
        <Modal open onClose={() => setDialog(null)} title={`Delete ${dialog.plan.name}?`} footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={pending} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => run(() => deletePlan(dialog.plan.id), 'Plan deleted')}>Delete plan</Button></>}>
          <p className="text-sm text-foreground/70">A plan can only be deleted when no member is on it.</p>
        </Modal>
      )}
    </DashShell>
  )
}

function PlanForm({ plan, pending, onClose, onSave }) {
  const [f, setF] = useState({ name: plan?.name || '', price: plan?.price ?? '', cycle: plan?.cycle || 'Monthly', features: (plan?.features || []).join(', '), color: plan?.color || '#ef4444', popular: !!plan?.popular })
  const set = (p) => setF(x => ({ ...x, ...p }))
  return (
    <Modal open onClose={onClose} title={plan ? 'Edit plan' : 'New plan'} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(f)}>{pending ? 'Saving…' : 'Save plan'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Plan name *"><input className={inputClass} value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Price *"><input className={inputClass} type="number" inputMode="decimal" min="0" value={f.price} onChange={e => set({ price: e.target.value })} /></Field>
        <Field label="Duration"><select className={inputClass} value={f.cycle} onChange={e => set({ cycle: e.target.value })}>{CYCLES.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Colour"><input className={`${inputClass} p-1`} type="color" value={f.color} onChange={e => set({ color: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Features" hint="Separate with commas."><input className={inputClass} value={f.features} onChange={e => set({ features: e.target.value })} /></Field></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-red-500" checked={f.popular} onChange={e => set({ popular: e.target.checked })} /> Mark as popular</label>
      </div>
    </Modal>
  )
}
