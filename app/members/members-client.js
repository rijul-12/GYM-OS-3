'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, UserPlus, MoreVertical } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { AddMemberModal } from '@/components/add-member-modal'
import { ScheduleEditor } from '@/components/schedule-editor'
import { Modal, Field, inputClass, StatusBadge, Empty, formatDate, formatMoney } from '@/components/ui-kit'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { updateMember, deleteMember, deactivateMember, reactivateMember, suspendMember, cancelMember, renewMembership, assignTrainerToMember, resendMemberInvite } from '@/actions/db/members'
import { recordMemberPayment } from '@/actions/db/member_payments'
import { ownerCheckInMember } from '@/actions/db/attendance'
import { addDuration, cycleToMonths } from '@/lib/domain/membership'

const FILTERS = ['All', 'Active', 'Pending', 'Expired', 'Suspended', 'Inactive', 'Cancelled', 'With dues']
const METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other']

export default function MembersClient({ initialMembers, plans, trainers }) {
  const router = useRouter()
  const { brand } = useBrand()
  const { user } = useAuth()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [review, setReview] = useState(null)
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null) // { type, member }
  const members = initialMembers || []
  const readOnly = !!user?.readOnly

  const counts = useMemo(() => {
    const c = { All: members.length, 'With dues': members.filter(m => m.outstandingAmount > 0).length }
    members.forEach(m => { c[m.status] = (c[m.status] || 0) + 1 })
    return c
  }, [members])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return members.filter(m => {
      if (filter === 'With dues' ? !(m.outstandingAmount > 0) : (filter !== 'All' && m.status !== filter)) return false
      if (!needle) return true
      return [m.name, m.email, m.phone, m.plan].some(v => String(v || '').toLowerCase().includes(needle))
    })
  }, [members, q, filter])

  // Runs a server action, reports the real outcome and refreshes server data (no page reload).
  const run = (fn, okMessage, after) => startTransition(async () => {
    try {
      const res = await fn()
      if (!res || res.error || res.success === false) { toast.error(res?.error || 'The action failed.'); return }
      if (okMessage) toast.success(okMessage)
      after?.(res)
      setDialog(null); setMenu(null)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    }
  })

  const actionsFor = (m) => {
    const items = [{ label: 'View details', onClick: () => setDialog({ type: 'view', member: m }) }]
    if (readOnly) return items
    if (m.status === 'Pending') items.push({ label: 'Review & approve', onClick: () => setReview(m) })
    items.push({ label: 'Edit details', onClick: () => setDialog({ type: 'edit', member: m }) })
    items.push({ label: 'Workout schedule', onClick: () => setDialog({ type: 'schedule', member: m }) })
    items.push({ label: m.status === 'Expired' ? 'Renew membership' : 'Renew / change plan', onClick: () => setDialog({ type: 'renew', member: m }) })
    if (m.outstandingAmount > 0) items.push({ label: 'Record payment', onClick: () => setDialog({ type: 'pay', member: m }) })
    items.push({ label: 'Assign trainer', onClick: () => setDialog({ type: 'trainer', member: m }) })
    if (m.status === 'Active') items.push({ label: 'Check in now', onClick: () => run(() => ownerCheckInMember(m.id), `${m.name} checked in`) })
    if (!m.hasAccount && m.email) items.push({ label: 'Resend invitation', onClick: () => run(() => resendMemberInvite(m.id), 'Invitation sent') })
    if (m.storedStatus === 'Active') items.push({ label: 'Suspend', onClick: () => run(() => suspendMember(m.id), 'Membership suspended') })
    if (['Suspended', 'Inactive', 'Cancelled'].includes(m.storedStatus)) items.push({ label: 'Reactivate', onClick: () => run(() => reactivateMember(m.id), 'Membership reactivated') })
    if (m.storedStatus === 'Active') items.push({ label: 'Deactivate', onClick: () => run(() => deactivateMember(m.id), 'Member deactivated') })
    if (m.storedStatus !== 'Cancelled') items.push({ label: 'Cancel membership', onClick: () => setDialog({ type: 'cancel', member: m }) })
    items.push({ label: 'Delete member', danger: true, onClick: () => setDialog({ type: 'delete', member: m }) })
    return items
  }

  return (
    <DashShell title="Members" subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}
      actions={!readOnly && <Button onClick={() => setAddOpen(true)} style={{ background: brand.primaryColor }} className="text-white border-0 h-10" data-testid="add-member"><UserPlus className="h-4 w-4 mr-2" />Add member</Button>}>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 h-11">
          <Search className="h-4 w-4 text-foreground/40 shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, e-mail or plan" className="bg-transparent outline-none text-base sm:text-sm flex-1 min-w-0" aria-label="Search members" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.filter(f => f === 'All' || counts[f]).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${filter === f ? 'bg-foreground text-background border-foreground' : 'border-foreground/15 text-foreground/60'}`}>
              {f} <span className="opacity-60">{counts[f] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {members.length === 0 ? (
        <Empty title="No members yet" hint="Add your first member, or bring your existing members in from a CSV or Excel file.">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => setAddOpen(true)} disabled={readOnly}>Add member</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/import')}>Bring your data</Button>
          </div>
        </Empty>
      ) : list.length === 0 ? (
        <Empty title="No members match" hint="Try a different search or filter." />
      ) : (
        <ul className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]" data-testid="member-list">
          {list.map(m => (
            <li key={m.id} className="flex items-center gap-3 px-3 sm:px-4 py-3" data-member={m.name}>
              <UserAvatar src={m.photoURL} name={m.name} size={40} />
              <button className="flex-1 min-w-0 text-left" onClick={() => m.status === 'Pending' && !readOnly ? setReview(m) : setDialog({ type: 'view', member: m })}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{m.name}</span>
                  <StatusBadge status={m.status} />
                  {m.outstandingAmount > 0 && <span className="text-[11px] text-amber-400">{formatMoney(m.outstandingAmount)} due</span>}
                </div>
                <div className="text-xs text-foreground/50 truncate mt-0.5">
                  {[m.plan || 'No plan', m.expiryDate ? `expires ${formatDate(m.expiryDate)}` : null, m.trainer_id ? `Trainer: ${m.trainer_name}` : null, m.phone || m.email].filter(Boolean).join(' · ')}
                </div>
              </button>
              <div className="relative shrink-0">
                <button aria-label={`Actions for ${m.name}`} onClick={() => setMenu(menu === m.id ? null : m.id)} className="p-2.5 rounded-lg hover:bg-foreground/[0.06]"><MoreVertical className="h-4 w-4" /></button>
                {menu === m.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                    <div className="absolute right-0 top-10 z-50 w-56 max-h-[60dvh] overflow-y-auto rounded-xl border border-foreground/10 bg-background shadow-2xl py-1" role="menu">
                      {actionsFor(m).map(a => (
                        <button key={a.label} role="menuitem" disabled={pending} onClick={() => { setMenu(null); a.onClick() }}
                          className={`w-full text-left text-sm px-3 py-2.5 hover:bg-foreground/[0.06] disabled:opacity-50 ${a.danger ? 'text-red-400' : ''}`}>{a.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddMemberModal open={addOpen} onOpenChange={setAddOpen} plans={plans} trainers={trainers} onSuccess={() => router.refresh()} />
      <AddMemberModal open={!!review} onOpenChange={(o) => !o && setReview(null)} plans={plans} trainers={trainers} reviewMember={review} onSuccess={() => router.refresh()} />

      {dialog?.type === 'view' && <ViewDialog m={dialog.member} onClose={() => setDialog(null)} />}
      {dialog?.type === 'edit' && <EditDialog m={dialog.member} pending={pending} onClose={() => setDialog(null)} onSave={(patch) => run(() => updateMember(dialog.member.id, patch), 'Member updated')} />}
      {dialog?.type === 'schedule' && <ScheduleDialog m={dialog.member} zones={brand.zones} pending={pending} onClose={() => setDialog(null)} onSave={(v) => run(() => updateMember(dialog.member.id, v), 'Schedule saved')} />}
      {dialog?.type === 'renew' && <RenewDialog m={dialog.member} plans={plans} pending={pending} onClose={() => setDialog(null)} onSave={(v) => run(() => renewMembership(dialog.member.id, v), 'Membership renewed')} />}
      {dialog?.type === 'pay' && <PayDialog m={dialog.member} pending={pending} onClose={() => setDialog(null)} onSave={(v) => run(() => recordMemberPayment(dialog.member.id, v), 'Payment recorded')} />}
      {dialog?.type === 'trainer' && <TrainerDialog m={dialog.member} trainers={trainers} pending={pending} onClose={() => setDialog(null)} onSave={(id) => run(() => assignTrainerToMember(dialog.member.id, id || null), id ? 'Trainer assigned' : 'Trainer unassigned')} />}
      {dialog?.type === 'cancel' && (
        <Modal open onClose={() => setDialog(null)} title="Cancel membership?" footer={<><Button variant="outline" onClick={() => setDialog(null)}>Keep</Button><Button disabled={pending} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => run(() => cancelMember(dialog.member.id), 'Membership cancelled')}>Cancel membership</Button></>}>
          <p className="text-sm text-foreground/70">{dialog.member.name} will no longer be able to check in. Their record and payment history are kept, and you can reactivate them later.</p>
        </Modal>
      )}
      {dialog?.type === 'delete' && <DeleteDialog m={dialog.member} pending={pending} onClose={() => setDialog(null)} onConfirm={() => run(() => deleteMember(dialog.member.id), 'Member deleted')} />}
    </DashShell>
  )
}

function ViewDialog({ m, onClose }) {
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-foreground/5 last:border-0"><span className="text-foreground/50 shrink-0">{k}</span><span className="text-right break-words min-w-0">{v || '—'}</span></div>
  return (
    <Modal open onClose={onClose} title={m.name} wide>
      <div className="flex items-center gap-3 mb-4"><UserAvatar src={m.photoURL} name={m.name} size={56} /><div><StatusBadge status={m.status} /><div className="text-xs text-foreground/50 mt-1">{m.hasAccount ? 'Has a login' : 'No login yet'}{m.sourceSystem === 'import' ? ' · Imported' : ''}</div></div></div>
      <div className="grid sm:grid-cols-2 gap-x-8">
        <div><Row k="Phone" v={m.phone} /><Row k="E-mail" v={m.email} /><Row k="Gender" v={m.gender} /><Row k="Date of birth" v={m.dob ? formatDate(m.dob) : ''} /><Row k="Emergency contact" v={m.emergencyContact} /><Row k="Goal" v={m.goal} /><Row k="Trainer" v={m.trainer_name} /></div>
        <div><Row k="Plan" v={m.plan} /><Row k="Start" v={formatDate(m.startDate)} /><Row k="Expiry" v={m.expiryDate ? formatDate(m.expiryDate) : 'No expiry'} /><Row k="Fee" v={formatMoney(m.paymentFee)} /><Row k="Paid" v={formatMoney(m.paymentAmount)} /><Row k="Outstanding" v={formatMoney(m.outstandingAmount)} /><Row k="Payment status" v={m.payment_status} /></div>
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-widest text-foreground/40 mb-1">Workout schedule</div>
      {m.noFixedSchedule ? <div className="text-sm">No Fixed Schedule</div> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">{Object.entries(m.schedule || {}).map(([d, v]) => <div key={d} className="rounded-lg border border-foreground/10 px-2.5 py-1.5"><div className="text-[11px] text-foreground/40">{d}</div>{v?.length ? v.join(' + ') : 'Rest'}</div>)}</div>
      )}
    </Modal>
  )
}

function EditDialog({ m, pending, onClose, onSave }) {
  const [f, setF] = useState({ name: m.name, phone: m.phone, email: m.email, gender: m.gender, dob: m.dob, emergencyContact: m.emergencyContact, goal: m.goal, address: m.address, biometric_id: m.biometric_id })
  const set = (p) => setF(x => ({ ...x, ...p }))
  return (
    <Modal open onClose={onClose} title={`Edit ${m.name}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(f)}>{pending ? 'Saving…' : 'Save changes'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name"><input className={inputClass} value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Phone"><input className={inputClass} type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="E-mail" hint={m.hasAccount ? 'Linked to a login — cannot be changed here.' : null}><input className={inputClass} type="email" disabled={m.hasAccount} value={f.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Gender"><select className={inputClass} value={f.gender} onChange={e => set({ gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
        <Field label="Date of birth"><input className={inputClass} type="date" value={f.dob || ''} onChange={e => set({ dob: e.target.value })} /></Field>
        <Field label="Emergency contact"><input className={inputClass} value={f.emergencyContact} onChange={e => set({ emergencyContact: e.target.value })} /></Field>
        <Field label="Goal"><input className={inputClass} value={f.goal} onChange={e => set({ goal: e.target.value })} /></Field>
        <Field label="Device user ID" hint="Only needed for biometric/turnstile hardware."><input className={inputClass} value={f.biometric_id} onChange={e => set({ biometric_id: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className={inputClass} value={f.address} onChange={e => set({ address: e.target.value })} /></Field></div>
      </div>
    </Modal>
  )
}

function ScheduleDialog({ m, zones, pending, onClose, onSave }) {
  const [v, setV] = useState({ noFixedSchedule: m.noFixedSchedule, schedule: m.schedule || {} })
  const options = [...new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', ...((zones || []).map(z => z.muscleGroup))])]
  return (
    <Modal open onClose={onClose} title={`${m.name} — workout schedule`} wide footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(v)}>{pending ? 'Saving…' : 'Save schedule'}</Button></>}>
      <ScheduleEditor value={v.schedule} noFixedSchedule={v.noFixedSchedule} options={options} onChange={setV} />
    </Modal>
  )
}

function RenewDialog({ m, plans, pending, onClose, onSave }) {
  const todayKey = new Date().toLocaleDateString('en-CA')
  const start0 = m.expiryDate && m.expiryDate >= todayKey ? m.expiryDate : todayKey
  const current = plans.find(p => p.id === m.planId) || plans.find(p => p.name === m.plan)
  const [f, setF] = useState({ planId: current?.id || '', plan: m.plan || '', startDate: start0, expiryDate: addDuration(start0, cycleToMonths(current?.cycle)), paymentFee: current?.price ?? m.paymentFee ?? '', amountPaid: '', paymentMethod: 'Cash' })
  const set = (p) => setF(x => ({ ...x, ...p }))
  const pick = (id) => { const p = plans.find(x => x.id === id); if (p) set({ planId: id, plan: p.name, paymentFee: p.price, expiryDate: addDuration(f.startDate, cycleToMonths(p.cycle)) }) }
  const due = Math.max(0, (Number(f.paymentFee) || 0) - (Number(f.amountPaid) || 0)) + (m.outstandingAmount || 0)
  return (
    <Modal open onClose={onClose} title={`Renew ${m.name}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(f)}>{pending ? 'Saving…' : 'Renew membership'}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><Field label="Plan">{plans.length ? <select className={inputClass} value={f.planId} onChange={e => pick(e.target.value)}><option value="">Select a plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)} / {p.cycle}</option>)}</select> : <input className={inputClass} value={f.plan} onChange={e => set({ plan: e.target.value })} />}</Field></div>
        <Field label="New period starts"><input className={inputClass} type="date" value={f.startDate} onChange={e => set({ startDate: e.target.value })} /></Field>
        <Field label="Expires"><input className={inputClass} type="date" value={f.expiryDate} min={f.startDate} onChange={e => set({ expiryDate: e.target.value })} /></Field>
        <Field label="Fee for this period"><input className={inputClass} type="number" inputMode="decimal" min="0" value={f.paymentFee} onChange={e => set({ paymentFee: e.target.value })} /></Field>
        <Field label="Amount paid now"><input className={inputClass} type="number" inputMode="decimal" min="0" value={f.amountPaid} onChange={e => set({ amountPaid: e.target.value })} /></Field>
        <Field label="Payment method"><select className={inputClass} value={f.paymentMethod} onChange={e => set({ paymentMethod: e.target.value })}>{METHODS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <div className="rounded-xl border border-foreground/10 px-4 py-3 self-end text-sm">
          {m.outstandingAmount > 0 && <div className="flex justify-between text-foreground/50"><span>Carried forward</span><span>{formatMoney(m.outstandingAmount)}</span></div>}
          <div className="flex justify-between font-semibold"><span>Outstanding after renewal</span><span>{formatMoney(due)}</span></div>
        </div>
      </div>
    </Modal>
  )
}

function PayDialog({ m, pending, onClose, onSave }) {
  const [f, setF] = useState({ amount: m.outstandingAmount, method: 'Cash', note: '' })
  return (
    <Modal open onClose={onClose} title={`Record payment — ${m.name}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(f)}>{pending ? 'Saving…' : 'Record payment'}</Button></>}>
      <p className="text-sm text-foreground/60 mb-4">Outstanding balance: <strong className="text-foreground">{formatMoney(m.outstandingAmount)}</strong></p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Amount received"><input className={inputClass} type="number" inputMode="decimal" min="0" max={m.outstandingAmount} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Method"><select className={inputClass} value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{METHODS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Note (optional)"><input className={inputClass} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field></div>
      </div>
    </Modal>
  )
}

function TrainerDialog({ m, trainers, pending, onClose, onSave }) {
  const [id, setId] = useState(m.trainer_id || '')
  const active = trainers.filter(t => t.status === 'Active')
  return (
    <Modal open onClose={onClose} title={`Trainer for ${m.name}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(id)}>{pending ? 'Saving…' : 'Save'}</Button></>}>
      {active.length === 0 ? <p className="text-sm text-foreground/60">You have no active trainers yet. Invite one from the Trainers page.</p> : (
        <Field label="Trainer"><select className={inputClass} value={id} onChange={e => setId(e.target.value)}><option value="">Unassigned</option>{active.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      )}
    </Modal>
  )
}

function DeleteDialog({ m, pending, onClose, onConfirm }) {
  const [text, setText] = useState('')
  return (
    <Modal open onClose={onClose} title="Delete member permanently?" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || text !== 'DELETE'} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>{pending ? 'Deleting…' : 'Delete member'}</Button></>}>
      <p className="text-sm text-foreground/70">This removes <strong>{m.name}</strong>, their attendance history, notifications and login. Payment records are kept in anonymised form for your accounts. This cannot be undone.</p>
      <div className="mt-4"><Field label="Type DELETE to confirm"><input className={inputClass} value={text} onChange={e => setText(e.target.value.toUpperCase())} autoCapitalize="characters" /></Field></div>
    </Modal>
  )
}
