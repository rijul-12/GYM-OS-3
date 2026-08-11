'use client'
import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Bell, Shield, Clock, Palette, Globe, QrCode, Download, Printer, Copy, AlertTriangle, User, Lock, Smartphone } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { regenerateGymCode } from '@/actions/db/gyms'
import QRCode from 'react-qr-code'
import { AppearanceSettings } from '@/components/appearance-settings'
import { WidgetBuilder } from '@/components/widget-builder'
import { MapPin } from 'lucide-react'

const SECTIONS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'widgets', label: 'Facilities / Zones', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'branding', label: 'White-Label Branding', icon: Palette },
]

const Row = ({ title, desc, children }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-foreground/5 last:border-0">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-foreground/50 mt-0.5">{desc}</div>
    </div>
    <div>{children}</div>
  </div>
)

function App() {
  const { brand, setBrand } = useBrand()
  const [active, setActive] = useState('general')
  const [isPending, startTransition] = useTransition()
  const [resetModal, setResetModal] = useState(false)
  const [resetText, setResetText] = useState('')

  return (
    <DashShell title="Settings" subtitle="Manage your gym’s operating preferences">
      <div className="grid lg:grid-cols-4 gap-5">
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-2 sticky top-24">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const on = active === s.id
              return (
                <button key={s.id} onClick={() => setActive(s.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${on ? 'bg-foreground/[0.06] text-foreground' : 'text-foreground/60 hover:text-foreground'}`}>
                  <Icon className="h-4 w-4" style={on ? { color: brand.primaryColor } : {}} /> {s.label}
                </button>
              )
            })}
          </div>
        </aside>

        <div className="lg:col-span-3">
          <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
            {active === 'general' && (
              <>
                <div className="mb-5">
                  <div className="text-lg font-semibold">General Settings</div>
                  <div className="text-xs text-foreground/50">Basic preferences for your gym</div>
                </div>
                <Row title="Gym Name" desc="Displayed everywhere on the platform"><Input value={brand.gymName} onChange={e => setBrand({ gymName: e.target.value })} className="w-56 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>
                <Row title="Timezone" desc="Used for reports and check-ins"><select value={brand.timezone || 'Asia/Kolkata'} onChange={e => setBrand({ timezone: e.target.value })} className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option value="Asia/Kolkata">Asia/Kolkata</option><option value="America/Los_Angeles">America/Los_Angeles</option><option value="America/New_York">America/New_York</option><option value="Europe/London">Europe/London</option></select></Row>
                <Row title="Currency" desc="For pricing and revenue displays"><select value={brand.currency || '₹ INR'} onChange={e => setBrand({ currency: e.target.value })} className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option value="₹ INR">₹ INR</option><option value="$ USD">$ USD</option><option value="€ EUR">€ EUR</option><option value="£ GBP">£ GBP</option></select></Row>
                <Row title="Language" desc="Interface language"><select value={brand.lang || 'English'} onChange={e => setBrand({ lang: e.target.value })} className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option value="English">English</option><option value="Español">Español</option><option value="Français">Français</option></select></Row>
              </>
            )}
            {active === 'notifications' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">Notifications</div><div className="text-xs text-foreground/50">Choose how you get alerted</div></div>
                <Row title="New signups" desc="Alert when a member joins"><Switch checked={brand.notif_signups ?? true} onCheckedChange={(v) => { setBrand({ notif_signups: v }); toast.success("Notification preferences saved") }} /></Row>
                <Row title="Membership expiring" desc="Notify 7 days before expiry"><Switch checked={brand.notif_expiring ?? true} onCheckedChange={(v) => { setBrand({ notif_expiring: v }); toast.success("Notification preferences saved") }} /></Row>
                <Row title="Peak occupancy warning" desc="When gym exceeds 90% capacity"><Switch checked={brand.notif_peak ?? true} onCheckedChange={(v) => { setBrand({ notif_peak: v }); toast.success("Notification preferences saved") }} /></Row>
                <Row title="Daily revenue summary" desc="Emailed at end of day"><Switch checked={brand.notif_daily_rev ?? false} onCheckedChange={(v) => { setBrand({ notif_daily_rev: v }); toast.success("Notification preferences saved") }} /></Row>
                <Row title="SMS alerts" desc="Text critical events to admin phone"><Switch checked={brand.notif_sms ?? false} onCheckedChange={(v) => { setBrand({ notif_sms: v }); toast.success("Notification preferences saved") }} /></Row>
              </>
            )}
            {active === 'attendance' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">Attendance</div><div className="text-xs text-foreground/50">Check-in behavior</div></div>
                <Row title="Auto check-out" desc="Automatically after inactivity"><Switch checked={brand.att_auto_checkout ?? true} onCheckedChange={(v) => setBrand({ att_auto_checkout: v })} /></Row>
                <Row title="Auto check-out timeout" desc="Minutes of inactivity"><Input type="number" value={brand.att_timeout ?? 120} onChange={(e) => setBrand({ att_timeout: parseInt(e.target.value) })} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>
                <Row title="Exit QR" desc="Require a physical scan to check out"><Switch checked={brand.att_exit_qr ?? false} onCheckedChange={(v) => setBrand({ att_exit_qr: v })} /></Row>
                <Row title="Attendance Radius" desc="GPS boundary (Future)"><Input type="number" value={brand.att_radius ?? 50} onChange={(e) => setBrand({ att_radius: parseInt(e.target.value) })} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>

                <div className="mt-10 mb-5 border-t border-foreground/10 pt-8">
                  <div className="text-lg font-semibold">QR Attendance Management</div>
                  <div className="text-xs text-foreground/50">Your fixed gym attendance QR code</div>
                </div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 flex flex-col md:flex-row gap-8 items-start">
                  <div className="bg-white p-4 rounded-xl shrink-0">
                    {brand.gymCode ? <QRCode value={`https://gymos.app/checkin/${brand.gymCode}`} size={160} /> : <div className="h-[160px] w-[160px] bg-foreground/5 flex items-center justify-center text-xs text-foreground/40 text-center px-4">No Code Generated</div>}
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-foreground/40 text-xs uppercase tracking-widest mb-1">Gym Code</div>
                        <div className="font-mono font-bold text-lg">{brand.gymCode || '—'}</div>
                      </div>
                      <div>
                        <div className="text-foreground/40 text-xs uppercase tracking-widest mb-1">Status</div>
                        <div className="text-emerald-400 font-medium flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Permanently Valid</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-foreground/5">
                      <div>
                        <div className="text-foreground/40 text-xs uppercase tracking-widest mb-1">Created Date</div>
                        <div className="font-medium">{brand.qrCreatedDate ? new Date(brand.qrCreatedDate).toLocaleDateString() : 'Today'}</div>
                      </div>
                      <div>
                        <div className="text-foreground/40 text-xs uppercase tracking-widest mb-1">Last Reset Date</div>
                        <div className="font-medium">{brand.qrLastResetDate ? new Date(brand.qrLastResetDate).toLocaleDateString() : 'Never'}</div>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => setResetModal(true)} variant="destructive" className="h-8 text-xs w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">Reset QR Code</Button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {active === 'security' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">Security</div><div className="text-xs text-foreground/50">Protect your operations</div></div>
                <Row title="Gym Invite Code" desc={`Current: ${brand.gymCode || 'DEMO'}`}>
                  <Button disabled={isPending} onClick={() => startTransition(async () => {
                    const newCode = await regenerateGymCode();
                    if (newCode) {
                      setBrand({ gymCode: newCode });
                      toast.success(`Invite Code rotated to ${newCode}`);
                    }
                  })} variant="outline" className="h-9 bg-foreground/[0.03] border-foreground/10 text-xs">
                    {isPending ? 'Regenerating...' : 'Regenerate Code'}
                  </Button>
                </Row>
                <Row title="Two-factor auth" desc="Required for all admins"><Switch checked={brand.sec_2fa ?? true} onCheckedChange={(v) => setBrand({ sec_2fa: v })} /></Row>
                <Row title="Session timeout" desc="Auto sign-out (minutes)"><Input type="number" value={brand.sec_timeout ?? 60} onChange={(e) => setBrand({ sec_timeout: parseInt(e.target.value) })} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>
                <Row title="IP allowlist" desc="Restrict admin access by IP"><Switch checked={brand.sec_ip ?? false} onCheckedChange={(v) => setBrand({ sec_ip: v })} /></Row>
                <Row title="Audit log" desc="Track every admin action"><Switch checked={brand.sec_audit ?? true} onCheckedChange={(v) => setBrand({ sec_audit: v })} /></Row>
                <Row title="Change password" desc="Rotate your admin password"><a href="/forgot-password"><Button variant="outline" className="h-9 bg-foreground/[0.03] border-foreground/10">Change Password</Button></a></Row>
              </>
            )}
            {active === 'branding' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">White-Label Branding</div><div className="text-xs text-foreground/50 text-foreground/50">Quick shortcuts to full white-label</div></div>
                <Row title="Full white-label editor" desc="Change logo, colors, banner and more"><a href="/branding"><Button style={{ background: brand.primaryColor }} className="h-9 border-0 text-foreground">Open editor</Button></a></Row>
              </>
            )}
            {active === 'appearance' && (
              <AppearanceSettings />
            )}
            {active === 'widgets' && (
              <WidgetBuilder />
            )}
          </motion.div>
        </div>
      </div>

      {resetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-red-500/30 rounded-2xl p-6 shadow-2xl relative">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-xl font-display font-bold text-center mb-2">Reset QR Code?</h3>
            <p className="text-sm text-foreground/70 text-center mb-6">
              Your existing QR Code will immediately stop working. All printed copies will become invalid. Members will no longer be able to check in using the old QR. You will need to print and replace the new QR Code.
            </p>
            <div className="mb-6 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/10">
              <label className="text-xs text-foreground/50 block mb-2 text-center text-red-400">Type <strong className="text-foreground">RESET</strong> to confirm</label>
              <Input value={resetText} onChange={e => setResetText(e.target.value)} className="bg-black border-red-500/50 text-center uppercase font-bold tracking-widest h-10" placeholder="RESET" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setResetModal(false); setResetText('') }} variant="outline" className="flex-1 bg-foreground/[0.03] border-foreground/10 text-foreground hover:bg-foreground/[0.06] hover:text-foreground">Cancel</Button>
              <Button
                disabled={resetText !== 'RESET' || isPending}
                onClick={() => startTransition(async () => {
                  const newCode = await regenerateGymCode();
                  if (newCode) {
                    setBrand({ gymCode: newCode, qrLastResetDate: new Date().toISOString() });
                    toast.success('Generated New QR Code! Please download and print the new design.');
                    setResetModal(false);
                    setResetText('');
                  }
                })}
                className="flex-1 bg-red-500 text-foreground hover:bg-red-600 border-0"
              >
                {isPending ? 'Generating...' : 'Generate New QR'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashShell>
  )
}

export default App
