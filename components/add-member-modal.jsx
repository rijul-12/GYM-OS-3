'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal, Field, inputClass, formatDate, formatMoney } from '@/components/ui-kit'
import { ScheduleEditor } from '@/components/schedule-editor'
import { createMember, approveMember } from '@/actions/db/members'
import { addDuration, cycleToMonths } from '@/lib/domain/membership'
import { MUSCLE_GROUPS } from '@/lib/domain/schedule'
import { useBrand } from './brand-provider'

const STEPS = ['Details', 'Membership', 'Schedule', 'Review']
const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']
const today = () => new Date().toLocaleDateString('en-CA')

const blank = () => ({
  name: '', phone: '', email: '', gender: '', dob: '', address: '', emergencyContact: '', goal: '',
  planId: '', plan: '', startDate: today(), expiryDate: '', paymentFee: '', amountPaid: '', paymentMethod: 'Cash',
  trainer_id: '', noFixedSchedule: true, schedule: {},
})

/**
 * Add a member, or review-and-approve a member who registered themselves
 * (`reviewMember`). The last step always shows the complete record before
 * anything is saved; dues and payment status are recalculated on the server.
 */
export function AddMemberModal({ open, onOpenChange, onSuccess, plans = [], trainers = [], reviewMember = null }) {
  const { brand } = useBrand()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isReview = !!reviewMember
  const set = (patch) => setForm(f => ({ ...f, ...patch }))

  useEffect(() => {
    if (!open) return
    setStep(isReview ? 1 : 0)
    setError(null)
    setForm(isReview ? {
      ...blank(), ...reviewMember,
      planId: reviewMember.planId || '', trainer_id: reviewMember.trainer_id || '',
      startDate: reviewMember.startDate || today(), expiryDate: reviewMember.expiryDate || '',
      paymentFee: reviewMember.paymentFee || '', amountPaid: reviewMember.paymentAmount || '',
      paymentMethod: reviewMember.paymentMethod || 'Cash',
      noFixedSchedule: reviewMember.noFixedSchedule !== false, schedule: reviewMember.schedule || {},
    } : blank())
  }, [open, isReview, reviewMember])

  const zoneOptions = useMemo(() => [...new Set([...MUSCLE_GROUPS, ...((brand.zones || []).map(z => z.muscleGroup))])], [brand.zones])
  const fee = Number(form.paymentFee) || 0
  const paid = Number(form.amountPaid) || 0
  const outstanding = Math.max(0, fee - paid)
  const paymentStatus = fee === 0 && paid === 0 ? 'Unpaid' : outstanding === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid'
  const trainer = trainers.find(t => t.id === form.trainer_id)

  const pickPlan = (planId) => {
    const p = plans.find(x => x.id === planId)
    if (!p) return set({ planId: '', plan: '' })
    set({ planId, plan: p.name, paymentFee: p.price, expiryDate: addDuration(form.startDate || today(), cycleToMonths(p.cycle)) })
  }

  const stepError = () => {
    if (step === 0) {
      if (form.name.trim().length < 2) return 'Enter the member\'s full name.'
      if (!form.phone.trim() && !form.email.trim()) return 'Enter a phone number or an e-mail address.'
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return 'Enter a valid e-mail address.'
    }
    if (step === 1) {
      if (!form.plan.trim()) return 'Choose a membership plan.'
      if (!form.startDate) return 'Choose a start date.'
      if (form.expiryDate && form.expiryDate < form.startDate) return 'Expiry date cannot be before the start date.'
      if (paid > fee) return 'Amount paid cannot be more than the fee.'
    }
    return null
  }

  const next = () => {
    const problem = stepError()
    if (problem) return setError(problem)
    setError(null)
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const submit = async () => {
    setSaving(true); setError(null)
    try {
      const payload = { ...form, trainer_id: form.trainer_id || null }
      const res = isReview ? await approveMember(reviewMember.id, payload) : await createMember(payload)
      if (!res || res.error) { setError(res?.error || 'Could not save the member.'); return }
      if (isReview) toast.success(`${form.name} approved`)
      else if (res.inviteSent) toast.success(`${form.name} added. An invitation e-mail was sent.`)
      else if (form.email) toast.success(`${form.name} added. The invitation e-mail could not be sent${res.inviteError ? ` (${res.inviteError})` : ''}.`)
      else toast.success(`${form.name} added`)
      onSuccess?.()
      onOpenChange(false)
    } catch {
      setError('Network error. Nothing was saved — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-foreground/50 shrink-0">{k}</span><span className="text-right break-words min-w-0">{v || '—'}</span></div>

  return (
    <Modal open={open} onClose={() => !saving && onOpenChange(false)} wide title={isReview ? `Review ${reviewMember?.name || 'member'}` : 'Add member'}
      footer={<>
        {step > (isReview ? 1 : 0) && <Button variant="outline" disabled={saving} onClick={() => { setError(null); setStep(s => s - 1) }}>Back</Button>}
        {step < STEPS.length - 1
          ? <Button onClick={next} style={{ background: brand.primaryColor }} className="text-white border-0">Continue</Button>
          : <Button onClick={submit} disabled={saving} style={{ background: brand.primaryColor }} className="text-white border-0" data-testid="member-submit">{saving ? 'Saving…' : isReview ? 'Approve member' : 'Create member'}</Button>}
      </>}>
      <ol className="flex gap-1.5 mb-5" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className="h-1 rounded-full" style={{ background: i <= step ? brand.primaryColor : 'rgba(127,127,127,0.25)' }} />
            <div className={`text-[11px] mt-1.5 ${i === step ? 'text-foreground' : 'text-foreground/40'}`}>{s}</div>
          </li>
        ))}
      </ol>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-3 py-2">{error}</div>}

      {step === 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name *"><input className={inputClass} value={form.name} onChange={e => set({ name: e.target.value })} autoComplete="off" name="member-name" /></Field>
          <Field label="Phone"><input className={inputClass} type="tel" inputMode="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} placeholder="98765 43210" name="member-phone" /></Field>
          <Field label="E-mail" hint="Used to invite the member to create their login."><input className={inputClass} type="email" inputMode="email" autoCapitalize="none" value={form.email} onChange={e => set({ email: e.target.value })} name="member-email" /></Field>
          <Field label="Gender"><select className={inputClass} value={form.gender} onChange={e => set({ gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="Date of birth"><input className={inputClass} type="date" value={form.dob} onChange={e => set({ dob: e.target.value })} /></Field>
          <Field label="Emergency contact"><input className={inputClass} value={form.emergencyContact} onChange={e => set({ emergencyContact: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Fitness goal"><input className={inputClass} value={form.goal} onChange={e => set({ goal: e.target.value })} /></Field></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Membership plan *" hint={plans.length === 0 ? 'No plans yet — type a plan name, or create plans under Membership Plans.' : null}>
            {plans.length > 0 ? (
              <select className={inputClass} value={form.planId} onChange={e => pickPlan(e.target.value)} name="member-plan">
                <option value="">Select a plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)} / {p.cycle}</option>)}
              </select>
            ) : <input className={inputClass} value={form.plan} onChange={e => set({ plan: e.target.value })} name="member-plan-text" />}
          </Field>
          <Field label="Trainer (optional)">
            <select className={inputClass} value={form.trainer_id} onChange={e => set({ trainer_id: e.target.value })}>
              <option value="">Unassigned</option>
              {trainers.filter(t => t.status === 'Active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Start date *"><input className={inputClass} type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })} /></Field>
          <Field label="Expiry date" hint="Leave empty for an open-ended membership."><input className={inputClass} type="date" value={form.expiryDate} min={form.startDate} onChange={e => set({ expiryDate: e.target.value })} /></Field>
          <Field label="Membership fee"><input className={inputClass} type="number" inputMode="decimal" min="0" value={form.paymentFee} onChange={e => set({ paymentFee: e.target.value })} name="member-fee" /></Field>
          <Field label="Amount paid"><input className={inputClass} type="number" inputMode="decimal" min="0" value={form.amountPaid} onChange={e => set({ amountPaid: e.target.value })} name="member-paid" /></Field>
          <Field label="Payment method"><select className={inputClass} value={form.paymentMethod} onChange={e => set({ paymentMethod: e.target.value })}>{METHODS.map(m => <option key={m}>{m}</option>)}</select></Field>
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 self-end">
            <div className="flex justify-between text-sm"><span className="text-foreground/50">Outstanding</span><span className="font-semibold" data-testid="member-outstanding">{formatMoney(outstanding)}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-foreground/50">Payment status</span><span>{paymentStatus}</span></div>
          </div>
        </div>
      )}

      {step === 2 && <ScheduleEditor value={form.schedule} noFixedSchedule={form.noFixedSchedule} options={zoneOptions} onChange={(v) => set(v)} />}

      {step === 3 && (
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4" data-testid="member-review">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-foreground/40 mb-1">Member</div>
            <Row k="Name" v={form.name} /><Row k="Phone" v={form.phone} /><Row k="E-mail" v={form.email} />
            <Row k="Gender" v={form.gender} /><Row k="Date of birth" v={form.dob ? formatDate(form.dob) : ''} /><Row k="Emergency contact" v={form.emergencyContact} /><Row k="Goal" v={form.goal} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-foreground/40 mb-1">Membership</div>
            <Row k="Plan" v={form.plan} /><Row k="Start" v={formatDate(form.startDate)} /><Row k="Expiry" v={form.expiryDate ? formatDate(form.expiryDate) : 'No expiry'} />
            <Row k="Fee" v={formatMoney(fee)} /><Row k="Paid" v={`${formatMoney(paid)} (${form.paymentMethod})`} /><Row k="Outstanding" v={formatMoney(outstanding)} /><Row k="Payment status" v={paymentStatus} />
            <Row k="Trainer" v={trainer ? trainer.name : 'Unassigned'} />
          </div>
          <div className="sm:col-span-2">
            <div className="text-[11px] uppercase tracking-widest text-foreground/40 mb-1">Workout schedule</div>
            {form.noFixedSchedule ? <div className="text-sm">No Fixed Schedule</div> : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {Object.entries(form.schedule).filter(([, v]) => v?.length).map(([d, v]) => <div key={d} className="rounded-lg border border-foreground/10 px-2.5 py-1.5"><div className="text-[11px] text-foreground/40">{d}</div>{v.join(' + ')}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
