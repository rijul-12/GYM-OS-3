'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { ScheduleEditor } from '@/components/schedule-editor'
import { Button } from '@/components/ui/button'
import { MUSCLE_GROUPS } from '@/lib/domain/schedule'
import { updateMember } from '@/actions/db/members'

export default function ScheduleClient({ member, zones }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [value, setValue] = useState({ noFixedSchedule: member?.noFixedSchedule ?? true, schedule: member?.schedule || {} })
  const [dirty, setDirty] = useState(false)
  if (!member) return <MemberMissing title="Workout Schedule" />
  const options = [...new Set([...MUSCLE_GROUPS, ...zones.map(z => z.muscleGroup)])]

  const save = () => start(async () => {
    try {
      const res = await updateMember(member.id, value)
      if (res?.error) return toast.error(res.error)
      setDirty(false); toast.success('Schedule saved'); router.refresh()
    } catch { toast.error('Network error. Your changes were not saved.') }
  })

  return (
    <PortalShell title="Workout Schedule">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-foreground/60 mb-4">Pick the muscle groups you train each day — more than one per day is fine. This is what you will be offered at check-in{member.trainer_id ? `, and ${member.trainer_name} can update it for you` : ''}.</p>
        <ScheduleEditor value={value.schedule} noFixedSchedule={value.noFixedSchedule} options={options} onChange={(v) => { setValue(v); setDirty(true) }} />
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4 mt-4">
          <Button className="w-full h-12" disabled={!dirty || pending} onClick={save} data-testid="save-schedule">{pending ? 'Saving…' : dirty ? 'Save schedule' : 'Saved'}</Button>
        </div>
      </div>
    </PortalShell>
  )
}
