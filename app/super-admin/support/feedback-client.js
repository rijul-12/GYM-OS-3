'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui-kit'
import { setFeedbackStatus } from '@/actions/db/superadmin'

export default function FeedbackClient({ items }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [show, setShow] = useState('unresolved')
  const list = items.filter(i => show === 'all' || i.status === show)
  const toggle = (i) => start(async () => {
    const res = await setFeedbackStatus(i.id, i.status === 'resolved' ? 'unresolved' : 'resolved')
    if (res?.error) toast.error(res.error); else router.refresh()
  })
  return (
    <SuperAdminShell title="Feedback" subtitle="Messages sent through “Send Feedback” in the portals">
      <div className="flex gap-1.5 mb-4">{['unresolved', 'resolved', 'all'].map(s => <button key={s} onClick={() => setShow(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${show === s ? 'bg-foreground text-background border-foreground' : 'border-foreground/15 text-foreground/60'}`}>{s}</button>)}</div>
      {list.length === 0 ? <Empty title="Nothing here" /> : (
        <ul className="space-y-3">
          {list.map(i => (
            <li key={i.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{i.category}</span><time className="text-[11px] text-foreground/50">{i.timestamp ? new Date(i.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</time></div>
              <p className="mt-1 whitespace-pre-wrap break-words">{i.text}</p>
              <div className="text-[11px] text-foreground/50 mt-2 break-all">{i.email} · {i.role}{i.gymCode ? ` · gym ${i.gymCode}` : ''}{i.page ? ` · ${i.page}` : ''}</div>
              <Button variant="outline" className="h-8 text-xs mt-3" disabled={pending} onClick={() => toggle(i)}>{i.status === 'resolved' ? 'Reopen' : 'Mark resolved'}</Button>
            </li>
          ))}
        </ul>
      )}
    </SuperAdminShell>
  )
}
