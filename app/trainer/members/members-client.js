'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TrainerShell } from '@/components/trainer-shell'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { Modal, Field, inputClass, StatusBadge, Empty, formatDate } from '@/components/ui-kit'
import { addNote, rejectMember } from '@/actions/db/trainer_operations'

export default function TrainerMembersClient({ initialMembers }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(null)
  const members = initialMembers || []
  const current = open ? members.find(m => m.id === open) : null

  const saveNote = () => start(async () => {
    const res = await addNote(current.id, note, 'General')
    if (res?.error) return toast.error(res.error)
    setNote(''); toast.success('Note added'); router.refresh()
  })
  const decline = () => start(async () => {
    const res = await rejectMember(confirm.id)
    if (res?.error) return toast.error(res.error)
    setConfirm(null); setOpen(null); toast.success('Member handed back to the owner'); router.refresh()
  })
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-foreground/5 last:border-0"><span className="text-foreground/50 shrink-0">{k}</span><span className="text-right break-words min-w-0">{v || '—'}</span></div>

  return (
    <TrainerShell title="Assigned Members" subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}>
      {members.length === 0 ? <Empty title="No members assigned yet" hint="The gym owner assigns members to you from the Members page." /> : (
        <ul className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
          {members.map(m => (
            <li key={m.id}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(m.id)}>
                <UserAvatar src={m.photoURL} name={m.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><span className="font-medium truncate">{m.name}</span><StatusBadge status={m.status} />{m.checkedIn && <span className="text-[11px] text-emerald-400">● in the gym</span>}</div>
                  <div className="text-xs text-foreground/50 truncate">{[m.goal, m.plan, m.expiryDate ? `expires ${formatDate(m.expiryDate)}` : null].filter(Boolean).join(' · ') || 'No details yet'}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && (
        <Modal open onClose={() => setOpen(null)} title={current.name} wide>
          <div className="grid sm:grid-cols-2 gap-x-8">
            <div><Row k="Phone" v={current.phone} /><Row k="E-mail" v={current.email} /><Row k="Gender" v={current.gender} /><Row k="Goal" v={current.goal} /><Row k="Medical notes" v={current.medicalNotes} /></div>
            <div><Row k="Membership" v={current.status} /><Row k="Plan" v={current.plan} /><Row k="Expires" v={current.expiryDate ? formatDate(current.expiryDate) : 'No expiry'} /><Row k="Height" v={current.height} /><Row k="Weight" v={current.weight} /></div>
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-foreground/40 mb-1">Weekly schedule</div>
          {current.noFixedSchedule ? <div className="text-sm">No Fixed Schedule</div> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">{Object.entries(current.schedule || {}).map(([d, v]) => <div key={d} className="rounded-lg border border-foreground/10 px-2.5 py-1.5"><div className="text-[11px] text-foreground/40">{d}</div>{v?.length ? v.join(' + ') : 'Rest'}</div>)}</div>
          )}
          <div className="mt-5 text-[11px] uppercase tracking-widest text-foreground/40 mb-2">Your notes</div>
          {(current.trainer_notes || []).length === 0 ? <div className="text-sm text-foreground/40">No notes yet.</div> : (
            <ul className="space-y-2">{[...current.trainer_notes].reverse().map(n => <li key={n.id} className="rounded-lg border border-foreground/10 px-3 py-2 text-sm"><div className="text-[11px] text-foreground/40">{n.ts}</div>{n.text}</li>)}</ul>
          )}
          <div className="mt-3"><Field label="Add a note"><textarea className={`${inputClass} h-20 py-2`} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} /></Field></div>
          <div className="mt-3 flex flex-wrap gap-2 justify-between">
            <Button variant="outline" className="text-red-400" onClick={() => setConfirm(current)}>Hand back to owner</Button>
            <Button disabled={pending || !note.trim()} onClick={saveNote}>{pending ? 'Saving…' : 'Save note'}</Button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal open onClose={() => setConfirm(null)} title={`Stop training ${confirm.name}?`} footer={<><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={pending} onClick={decline}>{pending ? 'Working…' : 'Hand back'}</Button></>}>
          <p className="text-sm text-foreground/70">The member stays in the gym but will no longer be assigned to you. The owner is notified and can assign another trainer.</p>
        </Modal>
      )}
    </TrainerShell>
  )
}
