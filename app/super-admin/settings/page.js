'use client'
import { useState } from 'react'
import { Save, Globe, ShieldAlert, Sparkles, RefreshCcw } from 'lucide-react'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { AppearanceSettings } from '@/components/appearance-settings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const SA = '#8b5cf6'

export default function SettingsPage() {
    const [loading, setLoading] = useState(false)
    const [flags, setFlags] = useState([])
    const [settings, setSettings] = useState({
        platformName: '',
        supportEmail: '',
        trialDays: 14,
        maxGymsPerOwner: 5,
        maintenanceMode: false,
        globalNotifications: false
    })

    const toggleFlag = (id) => {
        setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
    }

    const saveSettings = () => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            toast.success('Platform settings saved successfully')
        }, 600)
    }

    return (
        <SuperAdminShell title="Platform Settings" subtitle="Global configuration and feature flags">
            <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in duration-500">

                {/* Left Column: General & Notification Settings */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Globe className="h-4 w-4" style={{ color: SA }} />
                            <span className="font-display font-medium text-lg">General Preferences</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-foreground/50 block mb-1.5">Platform Name</label>
                                <Input value={settings.platformName} onChange={e => setSettings({ ...settings, platformName: e.target.value })} className="h-10 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div>
                                <label className="text-xs text-foreground/50 block mb-1.5">Support Email Route</label>
                                <Input value={settings.supportEmail} onChange={e => setSettings({ ...settings, supportEmail: e.target.value })} className="h-10 bg-foreground/[0.03] border-foreground/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-foreground/50 block mb-1.5">Trial Duration (Days)</label>
                                    <Input type="number" value={settings.trialDays} onChange={e => setSettings({ ...settings, trialDays: parseInt(e.target.value) })} className="h-10 bg-foreground/[0.03] border-foreground/10" />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/50 block mb-1.5">Max Gyms per Owner</label>
                                    <Input type="number" value={settings.maxGymsPerOwner} onChange={e => setSettings({ ...settings, maxGymsPerOwner: parseInt(e.target.value) })} className="h-10 bg-foreground/[0.03] border-foreground/10" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <ShieldAlert className="h-4 w-4 text-orange-400" />
                            <span className="font-display font-medium text-lg">System Controls</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                                <div>
                                    <div className="font-medium text-orange-400">Maintenance Mode</div>
                                    <div className="text-xs text-foreground/50">Suspends access for all non-super admins. API will return 503.</div>
                                </div>
                                <button onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-orange-500' : 'bg-white/10'}`}>
                                    <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-foreground/5 bg-foreground/[0.02]">
                                <div>
                                    <div className="font-medium text-foreground/90">Global Notifications</div>
                                    <div className="text-xs text-foreground/50">Allow platform-wide alert banners to be shown to all users.</div>
                                </div>
                                <button onClick={() => setSettings({ ...settings, globalNotifications: !settings.globalNotifications })} className={`relative h-6 w-11 rounded-full transition-colors ${settings.globalNotifications ? 'bg-purple-500' : 'bg-white/10'}`}>
                                    <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.globalNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl flex flex-col p-6 border border-foreground/5 bg-foreground/[0.02]">
                            <AppearanceSettings />
                        </div>
                    </div>

                    {/* Right Column: Feature Flags */}
                    <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-foreground/5">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-4 w-4" style={{ color: SA }} />
                                <span className="font-display font-medium text-lg">Feature Flags</span>
                            </div>
                            <p className="text-xs text-foreground/50">Toggle early-access or premium features across the entire platform.</p>
                        </div>

                        <div className="p-2 space-y-1">
                            {flags.map((flag) => (
                                <div key={flag.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-foreground/[0.02] transition group cursor-pointer" onClick={() => toggleFlag(flag.id)}>
                                    <div className="flex-1 pr-6">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{flag.name}</span>
                                            {flag.name.includes('Beta') && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">BETA</span>}
                                        </div>
                                        <div className="text-xs text-foreground/40 mt-1">{flag.desc}</div>
                                        <div className="text-[10px] font-mono text-foreground/30 mt-1.5">key: {flag.key}</div>
                                    </div>
                                    <button className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${flag.enabled ? 'bg-purple-500' : 'bg-white/10'}`}>
                                        <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminShell>
    )
}
