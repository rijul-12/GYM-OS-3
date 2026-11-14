'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui-kit'
import { useAuth } from '@/lib/auth'
import { completeOnboarding } from '@/actions/db/onboarding'
import { saveGymBrand } from '@/actions/db/gyms'

const STEPS = ['Your gym', 'Membership plans', 'Ready']

export default function OnboardingClient({ gymName, gymCode, capacity }) {
  const { refresh } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(gymName)
  const [cap, setCap] = useState(capacity)
  const [plans, setPlans] = useState([{ name: 'Monthly', price: '', features: '' }])

  const finish = async () => {
    setSaving(true)
    try {
      const res = await completeOnboarding({ gymInfo: { name }, plans: plans.filter(p => p.name.trim() && Number(p.price) > 0), attendanceMode: 'QR' })
      if (res?.error) return toast.error(res.error)
      if (parseInt(cap, 10) > 0) await saveGymBrand(null, { buildingCapacity: parseInt(cap, 10) })
      await refresh()
      window.location.assign('/dashboard')
    } catch { toast.error('Network error. Please try again.') } finally { setSaving(false) }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-xl rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-8">
        <div className="text-[11px] uppercase tracking-widest text-foreground/40">Step {step + 1} of {STEPS.length}</div>
        <h1 className="font-display text-2xl font-bold mt-1">{STEPS[step]}</h1>

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <Field label="Gym name" hint="Shown to your members and trainers."><input className={inputClass} value={name} maxLength={80} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Floor capacity (optional)" hint="How many people fit comfortably. Used for the live occupancy meter."><input className={inputClass} type="number" min="1" inputMode="numeric" value={cap} onChange={e => setCap(e.target.value)} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-foreground/60">Add the memberships you sell. Rows without a price are skipped. You can change these later under Membership Plans.</p>
            {plans.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-end">
                <Field label={i === 0 ? 'Plan name' : ''}><input className={inputClass} value={p.name} onChange={e => setPlans(plans.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></Field>
                <Field label={i === 0 ? 'Price' : ''}><input className={inputClass} type="number" min="0" inputMode="decimal" value={p.price} onChange={e => setPlans(plans.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} /></Field>
                <button aria-label="Remove plan" className="h-11 px-2 text-foreground/40 hover:text-red-400" onClick={() => setPlans(plans.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button className="text-sm underline text-foreground/60 inline-flex items-center gap-1" onClick={() => setPlans([...plans, { name: '', price: '', features: '' }])}><Plus className="h-3.5 w-3.5" />Add another plan</button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3 text-sm text-foreground/70">
            <p>Your gym code is <strong className="font-mono text-foreground">{gymCode}</strong>.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Print your check-in QR code from <strong>Settings → QR &amp; Attendance</strong> and put it at the entrance.</li>
              <li>Add members yourself, or import them under <strong>Bring Your Data</strong>.</li>
              <li>Members and trainers can also join with the gym code; you approve them first.</li>
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          {step > 0 ? <Button variant="outline" disabled={saving} onClick={() => setStep(step - 1)}>Back</Button> : <span />}
          {step < STEPS.length - 1
            ? <Button onClick={() => (step === 0 && name.trim().length < 2 ? toast.error('Enter your gym name.') : setStep(step + 1))}>Continue</Button>
            : <Button disabled={saving} onClick={finish} data-testid="finish-onboarding">{saving ? 'Saving…' : 'Open my dashboard'}</Button>}
        </div>
      </div>
    </div>
  )
}
