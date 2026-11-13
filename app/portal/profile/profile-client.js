'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PortalShell } from '@/components/portal-shell'
import { MemberMissing } from '@/components/member-missing'
import { PhotoUploader } from '@/components/photo-uploader'
import { AccountActions } from '@/components/account-actions'
import { AppearanceSettings } from '@/components/appearance-settings'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass, StatusBadge } from '@/components/ui-kit'
import { useAuth } from '@/lib/auth'
import { updateMember } from '@/actions/db/members'

export default function ProfileClient({ member }) {
  const router = useRouter()
  const { updateUser } = useAuth()
  const [pending, start] = useTransition()
  const [f, setF] = useState(() => ({ name: member?.name || '', phone: member?.phone || '', gender: member?.gender || '', dob: member?.dob || '', emergencyContact: member?.emergencyContact || '', goal: member?.goal || '', height: member?.height || '', weight: member?.weight || '', medicalNotes: member?.medicalNotes || '' }))
  const [dirty, setDirty] = useState(false)
  if (!member) return <MemberMissing title="Profile" />
  const set = (p) => { setF(x => ({ ...x, ...p })); setDirty(true) }

  const save = () => start(async () => {
    try {
      const res = await updateMember(member.id, f)
      if (res?.error) return toast.error(res.error)
      updateUser({ name: f.name })
      setDirty(false); toast.success('Profile saved'); router.refresh()
    } catch { toast.error('Network error. Your changes were not saved.') }
  })

  return (
    <PortalShell title="Profile">
      <div className="space-y-4 max-w-2xl mx-auto">
        <Card>
          <PhotoUploader name={member.name} initialUrl={member.photoURL} onChange={() => router.refresh()} />
          <div className="mt-4 flex items-center gap-2 flex-wrap"><span className="font-display text-xl font-bold">{member.name}</span><StatusBadge status={member.status} /></div>
          <div className="text-sm text-foreground/50">{member.gymName}{member.plan ? ` · ${member.plan}` : ''}</div>
        </Card>
        <Card title="Personal details">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name"><input className={inputClass} value={f.name} onChange={e => set({ name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Phone"><input className={inputClass} type="tel" inputMode="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} autoComplete="tel" /></Field>
            <Field label="Gender"><select className={inputClass} value={f.gender} onChange={e => set({ gender: e.target.value })}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
            <Field label="Date of birth"><input className={inputClass} type="date" value={f.dob || ''} onChange={e => set({ dob: e.target.value })} /></Field>
            <Field label="Height"><input className={inputClass} value={f.height} onChange={e => set({ height: e.target.value })} placeholder="e.g. 172 cm" /></Field>
            <Field label="Weight"><input className={inputClass} value={f.weight} onChange={e => set({ weight: e.target.value })} placeholder="e.g. 70 kg" /></Field>
            <Field label="Emergency contact"><input className={inputClass} value={f.emergencyContact} onChange={e => set({ emergencyContact: e.target.value })} /></Field>
            <Field label="Fitness goal"><input className={inputClass} value={f.goal} onChange={e => set({ goal: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Medical notes" hint="Visible to your gym and trainer."><input className={inputClass} value={f.medicalNotes} onChange={e => set({ medicalNotes: e.target.value })} /></Field></div>
          </div>
          <Button className="mt-4 h-11 w-full sm:w-auto" disabled={!dirty || pending} onClick={save}>{pending ? 'Saving…' : 'Save changes'}</Button>
        </Card>
        <Card><AppearanceSettings /></Card>
        <AccountActions />
      </div>
    </PortalShell>
  )
}
