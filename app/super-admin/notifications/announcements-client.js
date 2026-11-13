'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass } from '@/components/ui-kit'
import { sendOwnerAnnouncement } from '@/actions/db/superadmin'

export default function AnnouncementsClient({ sent, gyms }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [f, setF] = useState({ title: '', message: '', gymId: '' })
  const send = () => start(async () => {
    const res = await sendOwnerAnnouncement({ ...f, gymId: f.gymId || null })
    if (res?.error) return toast.error(res.error)
    toast.success(`Sent to ${res.recipients} gym${res.recipients === 1 ? '' : 's'}`); setF({ title: '', message: '', gymId: '' }); router.refresh()
  })
  return (
    <SuperAdminShell title="Notifications" subtitle="Platform events reach you through the bell icon. Send announcements to gym owners here.">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Send an announcement to owners" subtitle="Delivered as an in-app notification.">
          <div className="space-y-4">
            <Field label="To"><select className={inputClass} value={f.gymId} onChange={e => setF({ ...f, gymId: e.target.value })}><option value="">All active gyms</option>{gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
            <Field label="Title"><input className={inputClass} maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Message"><textarea className={`${inputClass} h-28 py-2`} maxLength={500} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field>
            <Button className="h-11 w-full" disabled={pending || !f.title.trim() || !f.message.trim()} onClick={send}>{pending ? 'Sending…' : 'Send'}</Button>
          </div>
        </Card>
        <Card title="Sent announcements">
          {sent.length === 0 ? <div className="text-sm text-foreground/40">None sent yet.</div> : (
            <ul className="divide-y divide-foreground/5 -my-2">{sent.map(s => <li key={s.id} className="py-3 text-sm"><div className="font-medium">{s.title}</div><div className="text-foreground/60">{s.message}</div><div className="text-[11px] text-foreground/40 mt-1">{new Date(s.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {s.recipients} recipient{s.recipients === 1 ? '' : 's'}</div></li>)}</ul>
          )}
        </Card>
      </div>
    </SuperAdminShell>
  )
}
