'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TrainerShell } from '@/components/trainer-shell'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { ScheduleEditor } from '@/components/schedule-editor'
import { Modal, Empty } from '@/components/ui-kit'
import { MUSCLE_GROUPS } from '@/lib/domain/schedule'
import { updateWorkoutPlan } from '@/actions/db/trainer_operations'

export default function TrainerPlansClient({ initialMembers, zones }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [edit, setEdit] = useState(null)
  const [value, setValue] = useState(null)
  const members = initialMembers || []
  const options = [...new Set([...MUSCLE_GROUPS, ...zones.map(z => z.muscleGroup)])]

  const openFor = (m) => { setEdit(m); setValue({ noFixedSchedule: m.noFixedSchedule, schedule: m.schedule || {} }) }
  const save = () => start(async () => {
    try {
      const res = await updateWorkoutPlan(edit.id, value.noFixedSchedule ? {} : value.schedule)
      if (res?.error) return toast.error(res.error)
      setEdit(null); toast.success(`Schedule saved for ${edit.name}`); router.refresh()
    } catch { toast.error('Network error. The schedule was not saved.') }
  })

  return (
    <TrainerShell title="Workout Schedules" subtitle="Weekly plans for your members">
      {members.length === 0 ? <Empty title="No members assigned yet" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {members.map(m => (
            <div key={m.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <div className="flex items-center gap-3"><UserAvatar src={m.photoURL} name={m.name} size={36} /><div className="flex-1 min-w-0"><div className="font-medium truncate">{m.name}</div><div className="text-xs text-foreground/50 truncate">{m.goal || 'No goal set'}</div></div><Button variant="outline" className="h-9 text-xs" onClick={() => openFor(m)}>Edit</Button></div>
              {m.noFixedSchedule ? <div className="mt-3 text-sm text-foreground/50">No Fixed Schedule</div> : (
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">{Object.entries(m.schedule || {}).map(([d, v]) => <div key={d} className="flex justify-between gap-2 rounded-lg bg-foreground/[0.04] px-2 py-1.5"><span className="text-foreground/40">{d.slice(0, 3)}</span><span className="truncate">{v?.length ? v.join(' + ') : 'Rest'}</span></div>)}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {edit && value && (
        <Modal open onClose={() => !pending && setEdit(null)} wide title={`${edit.name} — weekly schedule`} footer={<><Button variant="outline" disabled={pending} onClick={() => setEdit(null)}>Cancel</Button><Button disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save schedule'}</Button></>}>
          <p className="text-xs text-foreground/50 mb-3">The member sees this in their portal and is offered it at check-in.</p>
          <ScheduleEditor value={value.schedule} noFixedSchedule={value.noFixedSchedule} options={options} onChange={setValue} />
        </Modal>
      )}
    </TrainerShell>
  )
}
