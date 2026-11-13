'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass, Empty } from '@/components/ui-kit'
import { updateProgress } from '@/actions/db/trainer_operations'

const METRICS = [['weight', 'Body weight (kg)'], ['bench', 'Bench press (kg)'], ['squat', 'Squat (kg)'], ['deadlift', 'Deadlift (kg)']]

export default function TrainerProgressClient({ initialMembers }) {
  const router = useRouter()
  const { brand } = useBrand()
  const [pending, start] = useTransition()
  const members = initialMembers || []
  const [selected, setSelected] = useState(members[0]?.id || '')
  const [f, setF] = useState({ weight: '', bench: '', squat: '', deadlift: '', note: '' })
  const m = members.find(x => x.id === selected)
  const history = (m?.progress_history || []).filter(p => p.date).sort((a, b) => a.date.localeCompare(b.date))

  const save = () => start(async () => {
    const res = await updateProgress(m.id, f)
    if (res?.error) return toast.error(res.error)
    setF({ weight: '', bench: '', squat: '', deadlift: '', note: '' }); toast.success('Progress recorded'); router.refresh()
  })

  return (
    <TrainerShell title="Progress" subtitle="Measurements you record for your members">
      {members.length === 0 ? <Empty title="No members assigned yet" /> : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Record a measurement">
            <Field label="Member"><select className={inputClass} value={selected} onChange={e => setSelected(e.target.value)}>{members.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3 mt-3">{METRICS.map(([k, label]) => <Field key={k} label={label}><input className={inputClass} type="number" inputMode="decimal" min="0" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field>)}</div>
            <div className="mt-3"><Field label="Note"><input className={inputClass} value={f.note} maxLength={300} onChange={e => setF({ ...f, note: e.target.value })} /></Field></div>
            <Button className="w-full h-11 mt-4" disabled={pending || !m} onClick={save}>{pending ? 'Saving…' : 'Save'}</Button>
          </Card>
          <Card className="lg:col-span-2" title={m ? `${m.name} — history` : 'History'}>
            {history.length === 0 ? <div className="text-sm text-foreground/40 py-8 text-center">No measurements recorded for this member yet.</div> : (<>
              {history.length >= 2 && (
                <div className="h-56 mb-4"><ResponsiveContainer><LineChart data={history}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="date" stroke="#88888880" fontSize={10} /><YAxis stroke="#88888880" fontSize={11} width={32} /><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} /><Line dataKey="weight" name="Weight" stroke={brand.primaryColor} strokeWidth={2} connectNulls /><Line dataKey="bench" name="Bench" stroke="#60a5fa" strokeWidth={2} connectNulls /><Line dataKey="squat" name="Squat" stroke="#34d399" strokeWidth={2} connectNulls /><Line dataKey="deadlift" name="Deadlift" stroke="#fbbf24" strokeWidth={2} connectNulls /></LineChart></ResponsiveContainer></div>
              )}
              <ul className="divide-y divide-foreground/5 text-sm">{[...history].reverse().map(p => <li key={p.id} className="py-2 flex justify-between gap-3"><span className="text-foreground/50 shrink-0">{p.date}</span><span className="text-right">{METRICS.filter(([k]) => p[k] !== null && p[k] !== undefined).map(([k, l]) => `${l.split(' (')[0]} ${p[k]}`).join(' · ')}{p.note ? ` — ${p.note}` : ''}</span></li>)}</ul>
            </>)}
          </Card>
        </div>
      )}
    </TrainerShell>
  )
}
