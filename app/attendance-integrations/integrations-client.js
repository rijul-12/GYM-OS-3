'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { QrCode, UserCheck, Cpu, Copy } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Card, Modal, formatDate } from '@/components/ui-kit'
import { rotateIntegrationSecret, disableIntegration } from '@/actions/db/settings'

const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'), () => toast.error('Could not copy'))

export default function IntegrationsClient({ status: initial, gymCode, appUrl }) {
  const [status, setStatus] = useState(initial)
  const [secret, setSecret] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()

  const rotate = () => start(async () => {
    const res = await rotateIntegrationSecret()
    if (res?.error) return toast.error(res.error)
    setSecret(res.secret); setStatus({ enabled: true, createdAt: new Date().toISOString(), hint: res.secret.slice(-4) }); setConfirm(false)
  })
  const disable = () => start(async () => {
    const res = await disableIntegration()
    if (res?.error) return toast.error(res.error)
    setStatus({ enabled: false }); setSecret(null); toast.success('Hardware integration disabled')
  })

  return (
    <DashShell title="Integrations" subtitle="How attendance reaches BGM">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="QR check-in" subtitle="Active">
          <QrCode className="h-6 w-6 text-emerald-400 mb-3" />
          <p className="text-sm text-foreground/60">Members scan your gym QR code with their phone camera, confirm today&apos;s workout and are checked in.</p>
          <p className="text-xs text-foreground/50 mt-2">Current gym code: <span className="font-mono">{gymCode}</span></p>
          <Link href="/settings?tab=attendance" className="text-sm underline mt-3 inline-block">Print or regenerate the QR code</Link>
        </Card>
        <Card title="Front-desk check-in" subtitle="Active">
          <UserCheck className="h-6 w-6 text-emerald-400 mb-3" />
          <p className="text-sm text-foreground/60">Check a member in yourself from Members → ⋮ → “Check in now”, and check them out from Live Traffic.</p>
          <Link href="/members" className="text-sm underline mt-3 inline-block">Open Members</Link>
        </Card>
        <Card title="Biometric / turnstile hardware" subtitle={status.enabled ? `Enabled · key ends in ${status.hint}` : 'Not set up'}>
          <Cpu className={`h-6 w-6 mb-3 ${status.enabled ? 'text-emerald-400' : 'text-foreground/40'}`} />
          <p className="text-sm text-foreground/60">Devices that can send HTTP requests (ZKTeco / eSSL ADMS push, or a custom bridge) can record punches. Each member needs a “Device user ID” set in Members → Edit.</p>
          {status.enabled && status.createdAt && <p className="text-xs text-foreground/50 mt-2">Key created {formatDate(status.createdAt)}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button disabled={pending} className="h-9 text-xs" onClick={() => (status.enabled ? setConfirm(true) : rotate())}>{status.enabled ? 'Rotate key' : 'Generate integration key'}</Button>
            {status.enabled && <Button disabled={pending} variant="outline" className="h-9 text-xs" onClick={disable}>Disable</Button>}
          </div>
        </Card>
      </div>

      {status.enabled && (
        <Card className="mt-5" title="Device setup">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-foreground/50 mb-1">Generic JSON endpoint (send the key in the <code>x-api-key</code> header)</div>
              <pre className="rounded-lg bg-foreground/[0.05] p-3 text-xs overflow-x-auto">{`POST ${appUrl}/api/attendance/punch
x-api-key: <your integration key>
Content-Type: application/json

{ "biometricUserId": "1001", "timestamp": "2026-01-01T09:30:00+05:30", "device": "front-door" }`}</pre>
            </div>
            <div>
              <div className="text-xs text-foreground/50 mb-1">ZKTeco / eSSL ADMS cloud server address</div>
              <pre className="rounded-lg bg-foreground/[0.05] p-3 text-xs overflow-x-auto">{`${appUrl}/api/attendance/adms/iclock/cdata?key=<your integration key>`}</pre>
            </div>
            <p className="text-xs text-foreground/50">The first punch opens a session; the next punch (after one minute) closes it. Punches for members whose membership is not active are rejected. BGM has not been certified against specific device models — test with your device before relying on it.</p>
          </div>
        </Card>
      )}

      <Modal open={!!secret} onClose={() => setSecret(null)} title="Your integration key" footer={<Button onClick={() => setSecret(null)}>I have saved it</Button>}>
        <p className="text-sm text-foreground/70 mb-3">Copy this key now. For security it is not stored in readable form and cannot be shown again — if you lose it, rotate the key.</p>
        <div className="flex gap-2"><code className="flex-1 min-w-0 break-all rounded-lg bg-foreground/[0.05] p-3 text-xs" data-testid="integration-secret">{secret}</code><Button variant="outline" className="shrink-0" onClick={() => copy(secret)}><Copy className="h-4 w-4" /></Button></div>
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Rotate integration key?" footer={<><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={pending} onClick={rotate}>Rotate key</Button></>}>
        <p className="text-sm text-foreground/70">Devices using the current key will stop recording attendance until you enter the new key on them.</p>
      </Modal>
    </DashShell>
  )
}
