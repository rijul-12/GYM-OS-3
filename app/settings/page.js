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

const SECTIONS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
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
                <Row title="Timezone" desc="Used for reports and check-ins"><select className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option>America/Los_Angeles</option><option>America/New_York</option><option>Europe/London</option></select></Row>
                <Row title="Currency" desc="For pricing and revenue displays"><select value={brand.currency || '$ USD'} onChange={e => setBrand({ currency: e.target.value })} className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option value="₹ INR">₹ INR</option><option value="$ USD">$ USD</option><option value="€ EUR">€ EUR</option><option value="£ GBP">£ GBP</option></select></Row>
                <Row title="Language" desc="Interface language"><select className="h-9 rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm"><option>English</option><option>Español</option><option>Français</option></select></Row>
              </>
            )}
            {active === 'notifications' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">Notifications</div><div className="text-xs text-foreground/50">Choose how you get alerted</div></div>
                <Row title="New signups" desc="Alert when a member joins"><Switch defaultChecked /></Row>
                <Row title="Membership expiring" desc="Notify 7 days before expiry"><Switch defaultChecked /></Row>
                <Row title="Peak occupancy warning" desc="When gym exceeds 90% capacity"><Switch defaultChecked /></Row>
                <Row title="Daily revenue summary" desc="Emailed at end of day"><Switch /></Row>
                <Row title="SMS alerts" desc="Text critical events to admin phone"><Switch /></Row>
              </>
            )}
            {active === 'attendance' && (
              <>
                <div className="mb-5"><div className="text-lg font-semibold">Attendance</div><div className="text-xs text-foreground/50">Check-in behavior</div></div>
                <Row title="Auto check-out" desc="Automatically after inactivity"><Switch defaultChecked /></Row>
                <Row title="Auto check-out timeout" desc="Minutes of inactivity"><Input type="number" defaultValue={120} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>
                <Row title="Exit QR" desc="Require a physical scan to check out"><Switch /></Row>
                <Row title="Attendance Radius" desc="GPS boundary (Future)"><Input type="number" defaultValue={50} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>

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
                    <div className="flex flex-wrap gap-2 pt-4">
                      <Button onClick={() => toast.success('Downloaded as PNG')} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Download className="h-3.5 w-3.5 mr-1.5" /> Download PNG</Button>
                      <Button onClick={() => toast.success('Downloaded as PDF')} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF</Button>
                      <Button onClick={() => toast.success('Sent to printer')} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Printer className="h-3.5 w-3.5 mr-1.5" /> Print QR</Button>
                      <Button onClick={() => toast.success('Link copied')} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link</Button>
                    </div>
                    <div className="pt-2">
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
                <Row title="Two-factor auth" desc="Required for all admins"><Switch defaultChecked /></Row>
                <Row title="Session timeout" desc="Auto sign-out (minutes)"><Input type="number" defaultValue={60} className="w-24 bg-foreground/[0.03] border-foreground/10 h-9" /></Row>
                <Row title="IP allowlist" desc="Restrict admin access by IP"><Switch /></Row>
                <Row title="Audit log" desc="Track every admin action"><Switch defaultChecked /></Row>
                <Row title="Change password" desc="Rotate your admin password"><Button variant="outline" className="h-9 bg-foreground/[0.03] border-foreground/10">Change</Button></Row>
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
            <div className="pt-6 flex justify-end gap-2">
              <Button variant="outline" className="bg-foreground/[0.03] border-foreground/10">Cancel</Button>
              <Button onClick={() => toast.success('Settings saved')} style={{ background: brand.primaryColor }} className="text-foreground border-0">Save changes</Button>
            </div>
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
