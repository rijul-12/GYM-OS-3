'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Modal, Field, inputClass, StatusBadge, Empty, formatDate } from '@/components/ui-kit'
import { updateGymStatus, deleteGym } from '@/actions/db/gyms'
import { extendGymTrial } from '@/actions/db/subscriptions'

export default function GymsClient({ initialGyms }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')
  const [dialog, setDialog] = useState(null)
  const gyms = initialGyms || []
  const list = useMemo(() => { const n = q.trim().toLowerCase(); return gyms.filter(g => !n || [g.name, g.email, g.gymCode, g.city, g.ownerName].some(v => String(v || '').toLowerCase().includes(n))) }, [gyms, q])

  const run = (fn, ok) => start(async () => {
    try {
      const res = await fn()
      if (res === false || res?.error || res?.success === false) { toast.error(res?.error || 'The action failed.'); return }
      toast.success(ok); setDialog(null); router.refresh()
    } catch { toast.error('Network error. Please try again.') }
  })

  return (
    <SuperAdminShell title="Gyms" subtitle={`${gyms.length} gym${gyms.length === 1 ? '' : 's'} on the platform`}>
      <input className={`${inputClass} mb-4`} placeholder="Search gym, owner, e-mail, code or city" value={q} onChange={e => setQ(e.target.value)} aria-label="Search gyms" />
      {list.length === 0 ? <Empty title={gyms.length ? 'No gyms match' : 'No gyms yet'} hint={gyms.length ? null : 'Gyms appear here when owners register.'} /> : (
        <ul className="space-y-3">
          {list.map(g => (
            <li key={g.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{g.name}</span><StatusBadge status={g.status} />{g.subscriptionStatus && <StatusBadge status={g.subscriptionStatus} />}{g.isDemo && <span className="text-[11px] text-foreground/40">demo data</span>}</div>
              <div className="text-xs text-foreground/50 mt-1 break-words">{g.ownerName} · {g.email} · <span className="font-mono">{g.gymCode}</span>{g.city ? ` · ${g.city}` : ''}</div>
              <div className="text-xs text-foreground/50">{g.members} members · joined {formatDate(g.createdAt)}{g.subscriptionStatus === 'Trial' && g.trialEndDate ? ` · trial ends ${formatDate(g.trialEndDate)}` : ''}{g.subscriptionExpiryDate ? ` · paid until ${formatDate(g.subscriptionExpiryDate)}` : ''}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.status !== 'Active' && <Button disabled={pending} className="h-9 text-xs" onClick={() => run(() => updateGymStatus(g.id, 'Active'), `${g.name} activated`)}>{g.status === 'Pending' ? 'Approve' : 'Reactivate'}</Button>}
                {g.status === 'Active' && <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => setDialog({ type: 'suspend', g })}>Suspend</Button>}
                <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={() => setDialog({ type: 'trial', g })}>Extend trial</Button>
                <Button disabled={pending} variant="outline" className="h-9 text-xs text-red-400" onClick={() => setDialog({ type: 'delete', g })}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog?.type === 'suspend' && (
        <Modal open onClose={() => setDialog(null)} title={`Suspend ${dialog.g.name}?`} footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={pending} onClick={() => run(() => updateGymStatus(dialog.g.id, 'Suspended'), 'Gym suspended')}>Suspend</Button></>}>
          <p className="text-sm text-foreground/70">The owner, trainers and members of this gym will not be able to sign in or check in until it is reactivated. No data is deleted.</p>
        </Modal>
      )}
      {dialog?.type === 'trial' && <TrialDialog g={dialog.g} pending={pending} onClose={() => setDialog(null)} onSave={(date, reason) => run(() => extendGymTrial(dialog.g.id, date, reason), 'Trial extended')} />}
      {dialog?.type === 'delete' && <DeleteDialog g={dialog.g} pending={pending} onClose={() => setDialog(null)} onConfirm={() => run(() => deleteGym(dialog.g.id), 'Gym deleted')} />}
    </SuperAdminShell>
  )
}

function TrialDialog({ g, pending, onClose, onSave }) {
  const base = g.trialEndDate && new Date(g.trialEndDate) > new Date() ? new Date(g.trialEndDate) : new Date()
  const [date, setDate] = useState(new Date(base.getTime() + 30 * 86400000).toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  return (
    <Modal open onClose={onClose} title={`Extend trial — ${g.name}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || reason.trim().length < 3} onClick={() => onSave(`${date}T23:59:59+05:30`, reason)}>{pending ? 'Saving…' : 'Extend trial'}</Button></>}>
      <div className="space-y-4">
        <Field label="New trial end date"><input className={inputClass} type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Reason (recorded in the audit log)"><input className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function DeleteDialog({ g, pending, onClose, onConfirm }) {
  const [text, setText] = useState('')
  return (
    <Modal open onClose={onClose} title={`Delete ${g.name} permanently?`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending || text !== g.gymCode} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>{pending ? 'Deleting…' : 'Delete gym'}</Button></>}>
      <p className="text-sm text-foreground/70">Deletes the gym, its {g.members} members, trainers, attendance, plans, notifications and all of their logins, including the owner&apos;s. Payment records and the subscription history are retained (anonymised) for accounting. This cannot be undone.</p>
      <div className="mt-4"><Field label={`Type the gym code ${g.gymCode} to confirm`}><input className={`${inputClass} font-mono`} value={text} onChange={e => setText(e.target.value.trim())} /></Field></div>
    </Modal>
  )
}
