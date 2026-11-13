'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass } from '@/components/ui-kit'
import { saveGymBrand } from '@/actions/db/gyms'

const KEYS = ['gymName', 'logoText', 'primaryColor', 'accentColor', 'phone', 'email', 'address', 'banner', 'footer']
const DEFAULT_COLORS = { primaryColor: '#ef4444', accentColor: '#f87171' }

export default function BrandingPage() {
  const { brand, setBrand, ready } = useBrand()
  const [local, setLocal] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (ready && !local) setLocal(Object.fromEntries(KEYS.map(k => [k, brand[k] || '']))) }, [ready, brand, local])
  const update = (patch) => setLocal(p => ({ ...p, ...patch }))
  const dirty = local && KEYS.some(k => (brand[k] || '') !== local[k])

  const save = async () => {
    setSaving(true)
    try {
      const res = await saveGymBrand(null, local)
      if (!res?.success) return toast.error(res?.error || 'Branding could not be saved.')
      if (res.errors?.length) toast.error(res.errors[0])
      // Apply what the server accepted to the live theme; no page reload needed.
      setBrand(res.saved)
      setLocal(l => ({ ...l, ...res.saved }))
      toast.success('Branding saved')
    } catch { toast.error('Network error. Please try again.') } finally { setSaving(false) }
  }

  if (!local) return <DashShell title="White Label" subtitle="Your gym's branding"><Card><div className="text-sm text-foreground/40">Loading…</div></Card></DashShell>

  return (
    <DashShell title="White Label" subtitle="How your gym appears to members and trainers"
      actions={<><Button variant="outline" className="h-10" disabled={saving} onClick={() => update(DEFAULT_COLORS)}>Default colours</Button><Button className="h-10" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : dirty ? 'Save branding' : 'Saved'}</Button></>}>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Identity">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Gym name"><input className={inputClass} value={local.gymName} maxLength={80} onChange={e => update({ gymName: e.target.value })} /></Field>
              <Field label="Logo initials" hint="Up to 3 characters, shown in the logo tile."><input className={inputClass} value={local.logoText} maxLength={3} onChange={e => update({ logoText: e.target.value.toUpperCase() })} /></Field>
              <Field label="Primary colour"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg border border-foreground/10 bg-transparent" value={/^#[0-9a-fA-F]{6}$/.test(local.primaryColor) ? local.primaryColor : '#ef4444'} onChange={e => update({ primaryColor: e.target.value })} /><input className={inputClass} value={local.primaryColor} onChange={e => update({ primaryColor: e.target.value })} /></div></Field>
              <Field label="Accent colour"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg border border-foreground/10 bg-transparent" value={/^#[0-9a-fA-F]{6}$/.test(local.accentColor) ? local.accentColor : '#f87171'} onChange={e => update({ accentColor: e.target.value })} /><input className={inputClass} value={local.accentColor} onChange={e => update({ accentColor: e.target.value })} /></div></Field>
            </div>
          </Card>
          <Card title="Contact details" subtitle="Shown to your members.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone"><input className={inputClass} type="tel" value={local.phone} onChange={e => update({ phone: e.target.value })} /></Field>
              <Field label="E-mail"><input className={inputClass} type="email" value={local.email} onChange={e => update({ email: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Address"><input className={inputClass} value={local.address} onChange={e => update({ address: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Welcome line"><input className={inputClass} value={local.banner} maxLength={160} onChange={e => update({ banner: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Footer text"><input className={inputClass} value={local.footer} maxLength={200} onChange={e => update({ footer: e.target.value })} /></Field></div>
            </div>
          </Card>
        </div>
        <Card title="Preview" subtitle="Member portal header">
          <div className="rounded-xl border border-foreground/10 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-foreground/10">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${local.primaryColor}, ${local.accentColor})` }}>{local.logoText || (local.gymName || 'G').slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0"><div className="font-display font-bold truncate">{local.gymName || 'Your gym'}</div><div className="text-[10px] uppercase tracking-widest text-foreground/40">Member</div></div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm">{local.banner}</div>
              <button className="w-full h-10 rounded-lg text-white text-sm font-medium" style={{ background: local.primaryColor }}>Check in</button>
              <div className="text-[11px] text-foreground/40">{[local.phone, local.email].filter(Boolean).join(' · ')}</div>
              <div className="text-[10px] text-foreground/40 pt-2 border-t border-foreground/5">{local.footer}</div>
            </div>
          </div>
        </Card>
      </div>
    </DashShell>
  )
}
