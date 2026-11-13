'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Card, Empty, inputClass } from '@/components/ui-kit'
import { saveGymEquipment } from '@/actions/db/gyms'

export default function EquipmentsClient({ initialData }) {
  const [equipment, setEquipment] = useState(initialData || {})
  const [dirty, setDirty] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [pending, start] = useTransition()
  const change = (next) => { setEquipment(next); setDirty(true) }

  const save = () => start(async () => {
    const res = await saveGymEquipment(equipment)
    if (res?.error) return toast.error(res.error)
    setEquipment(res.equipment); setDirty(false); toast.success('Equipment saved')
  })
  const addCategory = () => {
    const name = newCat.trim()
    if (!name || equipment[name]) return
    change({ ...equipment, [name]: [] }); setNewCat('')
  }
  const cats = Object.keys(equipment)

  return (
    <DashShell title="Equipment" subtitle="Your gym's equipment inventory" actions={<Button className="h-10" disabled={!dirty || pending} onClick={save}>{pending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>}>
      <div className="flex gap-2 mb-5 max-w-md">
        <input className={inputClass} placeholder="New category, e.g. Cardio" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
        <Button variant="outline" className="h-11 shrink-0" onClick={addCategory}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      {cats.length === 0 ? <Empty title="No equipment listed" hint="Add a category such as Cardio or Free Weights, then list the machines in it." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {cats.map(cat => (
            <Card key={cat} title={cat} action={<button aria-label={`Remove ${cat}`} className="text-foreground/40 hover:text-red-400 p-1" onClick={() => { const { [cat]: _, ...rest } = equipment; change(rest) }}><Trash2 className="h-4 w-4" /></button>}>
              <ul className="space-y-2">
                {equipment[cat].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <input className={`${inputClass} h-10`} value={item.name} placeholder="Item name" onChange={e => change({ ...equipment, [cat]: equipment[cat].map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                    <input className={`${inputClass} h-10 w-20`} type="number" min="0" inputMode="numeric" aria-label="Quantity" value={item.qty} onChange={e => change({ ...equipment, [cat]: equipment[cat].map((x, j) => j === i ? { ...x, qty: e.target.value } : x) })} />
                    <button aria-label="Remove item" className="px-2 text-foreground/40 hover:text-red-400" onClick={() => change({ ...equipment, [cat]: equipment[cat].filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
              <button className="mt-3 text-xs underline text-foreground/60" onClick={() => change({ ...equipment, [cat]: [...equipment[cat], { name: '', qty: 1 }] })}>+ Add item</button>
            </Card>
          ))}
        </div>
      )}
    </DashShell>
  )
}
