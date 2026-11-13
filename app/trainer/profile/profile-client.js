'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TrainerShell } from '@/components/trainer-shell'
import { PhotoUploader } from '@/components/photo-uploader'
import { AccountActions } from '@/components/account-actions'
import { AppearanceSettings } from '@/components/appearance-settings'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass, StatusBadge, Empty } from '@/components/ui-kit'
import { useAuth } from '@/lib/auth'
import { updateTrainerProfile } from '@/actions/db/trainers'

export default function TrainerProfileClient({ trainer }) {
  const router = useRouter()
  const { updateUser } = useAuth()
  const [pending, start] = useTransition()
  const [f, setF] = useState(() => ({ name: trainer?.name || '', phone: trainer?.phone || '', specialization: trainer?.specialization || '', experience: trainer?.experience || '', preferredTiming: trainer?.preferredTiming || '', bio: trainer?.bio || '' }))
  const [dirty, setDirty] = useState(false)
  if (!trainer) return <TrainerShell title="Profile"><Empty title="Trainer profile not found" hint="Please contact your gym owner." /><div className="mt-4"><AccountActions /></div></TrainerShell>
  const set = (p) => { setF(x => ({ ...x, ...p })); setDirty(true) }

  const save = () => start(async () => {
    try {
      const res = await updateTrainerProfile(trainer.id, f)
      if (res?.error) return toast.error(res.error)
      updateUser({ name: f.name }); setDirty(false); toast.success('Profile saved'); router.refresh()
    } catch { toast.error('Network error. Your changes were not saved.') }
  })

  return (
    <TrainerShell title="Profile" subtitle={trainer.gymName}>
      <div className="space-y-4 max-w-2xl mx-auto">
        <Card>
          <PhotoUploader name={trainer.name} initialUrl={trainer.photoURL} onChange={() => router.refresh()} />
          <div className="mt-4 flex items-center gap-2 flex-wrap"><span className="font-display text-xl font-bold">{trainer.name}</span><StatusBadge status={trainer.status} /></div>
          <div className="text-sm text-foreground/50">{trainer.members} assigned member{trainer.members === 1 ? '' : 's'}</div>
        </Card>
        <Card title="Your details">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name"><input className={inputClass} value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} type="tel" inputMode="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} /></Field>
            <Field label="Specialization"><input className={inputClass} value={f.specialization} onChange={e => set({ specialization: e.target.value })} /></Field>
            <Field label="Experience"><input className={inputClass} value={f.experience} onChange={e => set({ experience: e.target.value })} /></Field>
            <Field label="Usual hours"><input className={inputClass} value={f.preferredTiming} onChange={e => set({ preferredTiming: e.target.value })} placeholder="e.g. 6–11 am" /></Field>
            <div className="sm:col-span-2"><Field label="About you"><textarea className={`${inputClass} h-24 py-2`} maxLength={600} value={f.bio} onChange={e => set({ bio: e.target.value })} /></Field></div>
          </div>
          <Button className="mt-4 h-11 w-full sm:w-auto" disabled={!dirty || pending} onClick={save}>{pending ? 'Saving…' : 'Save changes'}</Button>
        </Card>
        <Card><AppearanceSettings /></Card>
        <AccountActions />
      </div>
    </TrainerShell>
  )
}
