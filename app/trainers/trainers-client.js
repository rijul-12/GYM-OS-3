'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { Modal, Field, inputClass, StatusBadge, Empty, formatMoney } from '@/components/ui-kit'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { createTrainer, approveTrainer, suspendTrainer, removeTrainer, updateTrainerProfile, resendTrainerInvite } from '@/actions/db/trainers'

export default function TrainersClient({ initialTrainers }) {
  const router = useRouter()
  const { brand } = useBrand()
  const { user } = useAuth()
  const [pending, start] = useTransition()
  const [dialog, setDialog] = useState(null)
  const trainers = initialTrainers || []
  const readOnly = !!user?.readOnly

  const run = (fn, ok) => start(async () => {
    try {
      const res = await fn()
      if (!res || res.error) { toast.error(res?.error || 'The action failed.'); return }
      toast.success(typeof ok === 'function' ? ok(res) : ok)
      setDialog(null)
      router.refresh()
    } catch { toast.error('Network error. Please try again.') }
  })

  return (
    <DashShell title="Trainers" subtitle={`${trainers.length} trainer${trainers.length === 1 ? '' : 's'}`}
      actions={!readOnly && <Button onClick={() => setDialog({ type: 'invite' })} style={{ background: brand.primaryColor }} className="text-white border-0 h-10"><UserPlus className="h-4 w-4 mr-2" />Invite trainer</Button>}>
      {trainers.length === 0 ? (
        <Empty title="No trainers yet" hint="Invite a trainer by e-mail. They set their own password and can then manage the members you assign to them." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {trainers.map(t => (
            <div key={t.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 flex flex-col">
              <div className="flex items-center gap-3">
                <UserAvatar src={t.photoURL} name={t.name} size={48} />
                <div className="min-w-0 flex-1"><div className="font-medium truncate">{t.name}</div><div className="text-xs text-foreground/50 truncate">{t.specialization || 'Trainer'}</div></div>
                <StatusBadge status={t.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-[11px] text-foreground/40">Assigned members</dt><dd className="font-semibold">{t.members}</dd></div>
                <div><dt className="text-[11px] text-foreground/40">Salary</dt><dd className="font-semibold">{t.salary ? formatMoney(t.salary) : '—'}</dd></div>
                <div className="col-span-2 min-w-0"><dt className="text-[11px] text-foreground/40">Contact</dt><dd className="truncate text-foreground/70">{t.email}{t.phone ? ` · ${t.phone}` : ''}</dd></div>
              </dl>
              {!readOnly && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.status === 'Pending' && <Button disabled={pending} className="h-9 text-xs" onClick={() => run(() => approveTrainer(t.id), `${t.name} approved`)}>Approve</Button>}
                  {t.status === 'Invited' && <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => run(() => resendTrainerInvite(t.id), 'Invitation sent again')}>Resend invite</Button>}
                  {t.status === 'Active' && <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => run(() => suspendTrainer(t.id), `${t.name} suspended`)}>Suspend</Button>}
                  {t.status === 'Suspended' && <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => run(() => approveTrainer(t.id), `${t.name} reactivated`)}>Reactivate</Button>}
                  <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => setDialog({ type: 'edit', t })}>Edit</Button>
                  <Button disabled={pending} variant="outline" className="h-9 text-xs text-red-400" onClick={() => setDialog({ type: 'remove', t })}>Remove</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog?.type === 'invite' && <TrainerForm title="Invite trainer" submitLabel="Send invitation" pending={pending} onClose={() => setDialog(null)} requireEmail
        onSave={(f) => run(() => createTrainer(f), (res) => res.inviteSent ? 'Invitation e-mail sent' : `Trainer added, but the invitation e-mail could not be sent${res.inviteError ? `: ${res.inviteError}` : ''}`)} />}
      {dialog?.type === 'edit' && <TrainerForm title={`Edit ${dialog.t.name}`} submitLabel="Save" initial={dialog.t} pending={pending} onClose={() => setDialog(null)}
        onSave={(f) => run(() => updateTrainerProfile(dialog.t.id, f), 'Trainer updated')} />}
      {dialog?.type === 'remove' && (
        <Modal open onClose={() => setDialog(null)} title={`Remove ${dialog.t.name}?`} footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={pending} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => run(() => removeTrainer(dialog.t.id), (r) => `Trainer removed${r.unassignedMembers ? ` · ${r.unassignedMembers} member${r.unassignedMembers === 1 ? '' : 's'} unassigned` : ''}`)}>{pending ? 'Removing…' : 'Remove trainer'}</Button></>}>
          <p className="text-sm text-foreground/70">The trainer&apos;s login and profile are deleted. Their {dialog.t.members} assigned member{dialog.t.members === 1 ? '' : 's'} stay in your gym and become unassigned — no member is deleted.</p>
        </Modal>
      )}
    </DashShell>
  )
}

function TrainerForm({ title, submitLabel, initial = {}, pending, onClose, onSave, requireEmail = false }) {
  const [f, setF] = useState({ name: initial.name || '', email: initial.email || '', phone: initial.phone || '', specialization: initial.specialization || '', experience: initial.experience || '', salary: initial.salary || '' })
  const set = (p) => setF(x => ({ ...x, ...p }))
  return (
    <Modal open onClose={onClose} title={title} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave(f)}>{pending ? 'Saving…' : submitLabel}</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *"><input className={inputClass} value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label={`E-mail${requireEmail ? ' *' : ''}`} hint={requireEmail ? 'The invitation link is sent here.' : 'Cannot be changed.'}><input className={inputClass} type="email" autoCapitalize="none" disabled={!requireEmail} value={f.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Phone"><input className={inputClass} type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Specialization"><input className={inputClass} value={f.specialization} onChange={e => set({ specialization: e.target.value })} /></Field>
        <Field label="Experience"><input className={inputClass} value={f.experience} onChange={e => set({ experience: e.target.value })} placeholder="e.g. 5 years" /></Field>
        <Field label="Monthly salary" hint="Visible only to you."><input className={inputClass} type="number" inputMode="decimal" min="0" value={f.salary} onChange={e => set({ salary: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
