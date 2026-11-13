'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { PhotoUploader } from '@/components/photo-uploader'
import { AppearanceSettings } from '@/components/appearance-settings'
import { Button } from '@/components/ui/button'
import { Card, Field, inputClass } from '@/components/ui-kit'
import { useAuth } from '@/lib/auth'
import { savePricingSettings } from '@/actions/db/superadmin'

export default function SettingsClient({ pricing }) {
  const { user, signOut } = useAuth()
  const [pending, start] = useTransition()
  const [f, setF] = useState({ BASE_PLATFORM_FEE: pricing?.BASE_PLATFORM_FEE ?? 1999, ACTIVE_MEMBER_RATE: pricing?.ACTIVE_MEMBER_RATE ?? 20, REGISTRATION_FEE: pricing?.REGISTRATION_FEE ?? 2999 })
  const [signingOut, setSigningOut] = useState(false)
  const save = () => start(async () => {
    const res = await savePricingSettings(f)
    if (res?.error) toast.error(res.error); else toast.success('Pricing saved. It applies to the next payment each gym makes.')
  })
  const logout = async () => { setSigningOut(true); try { await signOut() } finally { window.location.assign('/login') } }

  return (
    <SuperAdminShell title="Settings" subtitle="Your profile and platform pricing">
      <div className="space-y-4 max-w-2xl">
        <Card title="Your profile">
          <PhotoUploader name={user?.name} />
          <div className="mt-4 text-sm"><div className="font-medium">{user?.name}</div><div className="text-foreground/50 break-all">{user?.email}</div></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/forgot-password"><Button variant="outline" className="h-10">Change password</Button></Link>
            <Button variant="outline" className="h-10" disabled={signingOut} onClick={logout}><LogOut className="h-4 w-4 mr-2" />{signingOut ? 'Signing out…' : 'Sign out'}</Button>
          </div>
        </Card>
        <Card title="Platform pricing (INR)" subtitle="What gyms pay BGM. Changes are recorded in the audit log.">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Monthly platform fee"><input className={inputClass} type="number" min="0" inputMode="numeric" value={f.BASE_PLATFORM_FEE} onChange={e => setF({ ...f, BASE_PLATFORM_FEE: e.target.value })} /></Field>
            <Field label="Per active member"><input className={inputClass} type="number" min="0" inputMode="numeric" value={f.ACTIVE_MEMBER_RATE} onChange={e => setF({ ...f, ACTIVE_MEMBER_RATE: e.target.value })} /></Field>
            <Field label="One-time registration fee"><input className={inputClass} type="number" min="0" inputMode="numeric" value={f.REGISTRATION_FEE} onChange={e => setF({ ...f, REGISTRATION_FEE: e.target.value })} /></Field>
          </div>
          <Button className="mt-4 h-11" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save pricing'}</Button>
        </Card>
        <Card><AppearanceSettings /></Card>
      </div>
    </SuperAdminShell>
  )
}
