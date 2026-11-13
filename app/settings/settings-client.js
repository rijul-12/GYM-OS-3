'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { useAuth } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, Modal, Field, inputClass, formatDate, formatMoney } from '@/components/ui-kit'
import { PhotoUploader } from '@/components/photo-uploader'
import { AppearanceSettings } from '@/components/appearance-settings'
import { WidgetBuilder } from '@/components/widget-builder'
import { regenerateGymCode } from '@/actions/db/gyms'
import { deleteMyAccount } from '@/actions/db/account'

const TABS = [['general', 'General'], ['attendance', 'QR & Attendance'], ['widgets', 'Facilities'], ['billing', 'Member payments'], ['notifications', 'Notifications'], ['appearance', 'Appearance'], ['account', 'Account']]
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC']

const Row = ({ title, desc, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-foreground/5 last:border-0">
    <div className="min-w-0"><div className="text-sm font-medium">{title}</div>{desc && <div className="text-xs text-foreground/50 mt-0.5">{desc}</div>}</div>
    <div className="shrink-0 sm:max-w-[60%]">{children}</div>
  </div>
)

export default function SettingsClient({ cost, razorpayConfigured, appUrl }) {
  const { brand, setBrand, ready } = useBrand()
  const { user, signOut } = useAuth()
  const params = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'general')
  const [pending, start] = useTransition()
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [origin, setOrigin] = useState(appUrl)
  const qrRef = useRef(null)

  useEffect(() => { if (window.location.hostname !== 'localhost') setOrigin(appUrl) ; else setOrigin(window.location.origin) }, [appUrl])
  const checkinUrl = brand.gymCode ? `${origin}/checkin/${brand.gymCode}` : null

  const regenerate = () => start(async () => {
    const code = await regenerateGymCode()
    if (!code) return toast.error('The QR code could not be regenerated.')
    setBrand({ gymCode: code, qrLastResetDate: new Date().toISOString() })
    setResetOpen(false); setResetText('')
    toast.success('New QR code generated. The previous code no longer works — print the new one.')
  })

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const size = 1024, pad = 80
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size + 120
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2)
      ctx.fillStyle = '#000'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${brand.gymName} — scan to check in`, size / 2, size + 40)
      const a = document.createElement('a'); a.download = `${brand.gymCode}-checkin-qr.png`; a.href = canvas.toDataURL('image/png'); a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))
  }

  const removeAccount = () => start(async () => {
    const res = await deleteMyAccount(deleteText)
    if (res?.error) return toast.error(res.error)
    await signOut()
    window.location.assign('/')
  })

  const recovery = brand.memberFeeRecovery ? (cost?.activePaidMembers || 0) * (Number(brand.memberFeeAmount) || 0) : 0

  return (
    <DashShell title="Settings" subtitle="Your gym's preferences">
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 text-sm px-3 py-2 rounded-lg border transition ${tab === id ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-foreground/60'}`}>{label}</button>)}
      </div>

      {!ready ? <Card><div className="text-sm text-foreground/40">Loading settings…</div></Card> : <>
        {tab === 'general' && (
          <Card title="General">
            <Row title="Your profile photo" desc="Shown in the header and on your account."><PhotoUploader name={user?.name} size={64} /></Row>
            <Row title="Gym name" desc="Shown to your members and trainers."><input className={`${inputClass} sm:w-64`} value={brand.gymName || ''} onChange={e => setBrand({ gymName: e.target.value })} /></Row>
            <Row title="Gym capacity" desc="Maximum people on the floor. Used for the occupancy meter; leave empty to show head-count only."><input className={`${inputClass} sm:w-32`} type="number" min="1" inputMode="numeric" value={brand.buildingCapacity ?? ''} onChange={e => e.target.value && setBrand({ buildingCapacity: parseInt(e.target.value, 10) })} /></Row>
            <Row title="Timezone" desc="Used for “today”, check-ins, expiry dates and reports."><select className={`${inputClass} sm:w-64`} value={brand.timezone || 'Asia/Kolkata'} onChange={e => setBrand({ timezone: e.target.value })}>{TIMEZONES.map(t => <option key={t}>{t}</option>)}</select></Row>
            <Row title="Currency"><select className={`${inputClass} sm:w-64`} value={brand.currency || '₹ INR'} onChange={e => setBrand({ currency: e.target.value })}><option>₹ INR</option><option>$ USD</option><option>€ EUR</option><option>£ GBP</option><option>AED AED</option></select></Row>
            <Row title="Show my gym on the BGM website" desc="Lists your gym's name on the public home page."><Switch checked={!!brand.publicDisplay} onCheckedChange={v => setBrand({ publicDisplay: v })} /></Row>
            <Row title="White-label branding" desc="Logo text, colours and contact details."><Link href="/branding"><Button variant="outline" className="h-10">Open branding</Button></Link></Row>
          </Card>
        )}

        {tab === 'attendance' && (<>
          <Card title="Gym check-in QR code" subtitle="One QR code for your gym. It stays the same until you regenerate it.">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div ref={qrRef} className="bg-white p-4 rounded-xl shrink-0 mx-auto md:mx-0">{checkinUrl ? <QRCode value={checkinUrl} size={180} /> : <div className="h-[180px] w-[180px]" />}</div>
              <div className="flex-1 w-full min-w-0 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[11px] uppercase tracking-widest text-foreground/40">Gym code</div><div className="font-mono font-bold break-all" data-testid="gym-code">{brand.gymCode || '—'}</div></div>
                  <div><div className="text-[11px] uppercase tracking-widest text-foreground/40">Last regenerated</div><div>{brand.qrLastResetDate ? formatDate(brand.qrLastResetDate) : 'Never'}</div></div>
                </div>
                <div className="text-xs text-foreground/50 break-all">{checkinUrl}</div>
                <p className="text-xs text-foreground/50">Members scan it with their phone camera. The same code is what trainers and members enter to join your gym.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="h-10" onClick={downloadQr} disabled={!checkinUrl}>Download PNG</Button>
                  <Button variant="outline" className="h-10" onClick={() => window.print()} disabled={!checkinUrl}>Print</Button>
                  <Button variant="outline" className="h-10" disabled={!checkinUrl} onClick={() => navigator.clipboard?.writeText(brand.gymCode).then(() => toast.success('Gym code copied'))}>Copy code</Button>
                  <Button className="h-10 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" disabled={user?.readOnly} onClick={() => setResetOpen(true)}>Regenerate QR</Button>
                </div>
              </div>
            </div>
          </Card>
          <Card className="mt-4" title="Sessions">
            <Row title="Auto check-out" desc="Close sessions that members forget to complete, so they stop counting towards live occupancy."><Switch checked={brand.att_auto_checkout !== false} onCheckedChange={v => setBrand({ att_auto_checkout: v })} /></Row>
            {brand.att_auto_checkout !== false && <Row title="Auto check-out after" desc="Minutes after check-in (30–720)."><input className={`${inputClass} sm:w-32`} type="number" min="30" max="720" inputMode="numeric" value={brand.att_timeout ?? 240} onChange={e => { const n = parseInt(e.target.value, 10); if (n >= 30 && n <= 720) setBrand({ att_timeout: n }) }} /></Row>}
          </Card>
        </>)}

        {tab === 'widgets' && <Card title="Facilities / workout zones" subtitle="Members choose from these at check-in; Live Traffic shows demand for each. Capacity is optional."><WidgetBuilder /></Card>}

        {tab === 'billing' && (<>
          <Card title="How members can pay you" subtitle="Each option is independent. Payments you collect in person can always be recorded from Members.">
            <Row title="Direct UPI" desc="Members transfer to your UPI ID and report it. The payment stays “pending verification” until you confirm you received it."><Switch checked={!!brand.upi_enabled} onCheckedChange={v => setBrand({ upi_enabled: v })} /></Row>
            {brand.upi_enabled && <>
              <Row title="Your UPI ID" desc="Optional — without one, members are not shown a UPI option."><input className={`${inputClass} sm:w-64`} placeholder="yourgym@okhdfcbank" autoCapitalize="none" value={brand.upi_id || ''} onChange={e => setBrand({ upi_id: e.target.value.trim() })} data-testid="upi-id" /></Row>
              <Row title="Show UPI ID to members" desc="Only signed-in members of your gym can see it."><Switch checked={brand.upi_show_to_members !== false} onCheckedChange={v => setBrand({ upi_show_to_members: v })} /></Row>
            </>}
            <Row title="Online payments (Razorpay)" desc={razorpayConfigured ? 'Cards, UPI and net-banking, verified automatically. Collected through BGM\'s Razorpay account — settlement to your bank is arranged with BGM.' : 'Not available yet: BGM has not configured Razorpay for this deployment.'}><Switch disabled={!razorpayConfigured && !brand.razorpay_enabled} checked={!!brand.razorpay_enabled} onCheckedChange={v => setBrand({ razorpay_enabled: v })} /></Row>
          </Card>
          <Card className="mt-4" title="Your BGM cost" subtitle="Usage-based: platform fee plus a fee per active paid member.">
            <div className="space-y-2 text-sm max-w-md">
              <div className="flex justify-between"><span className="text-foreground/60">Active paid members</span><span>{cost?.activePaidMembers ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-foreground/60">Platform fee</span><span>{formatMoney(cost?.baseFee)}</span></div>
              <div className="flex justify-between"><span className="text-foreground/60">Member fee ({formatMoney(cost?.rate)} each)</span><span>{formatMoney(cost?.usageCost)}</span></div>
              <div className="flex justify-between font-semibold border-t border-foreground/10 pt-2"><span>Monthly total</span><span>{formatMoney(cost?.totalCost)}</span></div>
            </div>
            <Row title="Recover the fee from members" desc="A note of how much you add to each member's fee. This is for your own planning; BGM does not charge members automatically."><Switch checked={!!brand.memberFeeRecovery} onCheckedChange={v => setBrand({ memberFeeRecovery: v })} /></Row>
            {brand.memberFeeRecovery && <Row title="Amount per member" desc={`Estimated recovery: ${formatMoney(recovery)} of ${formatMoney(cost?.totalCost)}`}><input className={`${inputClass} sm:w-32`} type="number" min="0" inputMode="numeric" value={brand.memberFeeAmount ?? ''} onChange={e => setBrand({ memberFeeAmount: parseInt(e.target.value, 10) || 0 })} /></Row>}
          </Card>
        </>)}

        {tab === 'notifications' && (
          <Card title="Notifications" subtitle="In-app notifications appear under the bell icon.">
            <Row title="New sign-ups" desc="When a member or trainer registers with your gym code."><Switch checked={brand.notif_signups !== false} onCheckedChange={v => setBrand({ notif_signups: v })} /></Row>
            <Row title="Membership expiry reminders" desc="Remind members 7, 3 and 1 day before their membership expires (in-app and e-mail)."><Switch checked={brand.notif_expiring !== false} onCheckedChange={v => setBrand({ notif_expiring: v })} /></Row>
          </Card>
        )}

        {tab === 'appearance' && <Card><AppearanceSettings /></Card>}

        {tab === 'account' && (<>
          <Card title="Account">
            <Row title="Signed in as" desc={user?.email}><span className="text-sm text-foreground/60">{user?.emailVerified ? 'E-mail verified' : 'E-mail not verified'}</span></Row>
            <Row title="Password" desc="We e-mail you a link to choose a new password."><Link href="/forgot-password"><Button variant="outline" className="h-10">Change password</Button></Link></Row>
            <Row title="BGM subscription"><Link href="/dashboard/subscription"><Button variant="outline" className="h-10">Manage subscription</Button></Link></Row>
          </Card>
          <Card className="mt-4 border-red-500/20" title="Delete gym and account" subtitle="Permanently deletes your gym, all members, trainers, attendance and logins. Payment records are retained in anonymised form as required for accounting.">
            <Button className="h-10 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => setDeleteOpen(true)}>Delete my gym…</Button>
          </Card>
        </>)}
      </>}

      <Modal open={resetOpen} onClose={() => { setResetOpen(false); setResetText('') }} title="Regenerate the QR code?" footer={<><Button variant="outline" onClick={() => { setResetOpen(false); setResetText('') }}>Cancel</Button><Button disabled={resetText !== 'RESET' || pending} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={regenerate} data-testid="confirm-regenerate">{pending ? 'Generating…' : 'Generate new QR'}</Button></>}>
        <p className="text-sm text-foreground/70">The current QR code and gym code stop working immediately. Every printed copy becomes invalid and you will need to print the new one.</p>
        <div className="mt-4"><Field label="Type RESET to confirm"><input className={`${inputClass} text-center font-bold tracking-widest`} value={resetText} onChange={e => setResetText(e.target.value.toUpperCase())} autoCapitalize="characters" /></Field></div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteText('') }} title="Delete your gym permanently?" footer={<><Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteText('') }}>Cancel</Button><Button disabled={pending || deleteText.trim() !== String(brand.gymName || '').trim()} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={removeAccount}>{pending ? 'Deleting…' : 'Delete everything'}</Button></>}>
        <p className="text-sm text-foreground/70">This cannot be undone. All members and trainers lose access immediately.</p>
        <div className="mt-4"><Field label={`Type your gym name (${brand.gymName}) to confirm`}><input className={inputClass} value={deleteText} onChange={e => setDeleteText(e.target.value)} /></Field></div>
      </Modal>
    </DashShell>
  )
}
