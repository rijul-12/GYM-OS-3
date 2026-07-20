'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Check, AlertCircle, Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Wifi, Cpu, Signal, Battery, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FIELD_CATALOG, TEST_STEPS, mockDeviceInfo } from '@/lib/attendance/providers'
import { saveConnection } from '@/lib/attendance/store'
import { toast } from 'sonner'
import { useBrand } from './brand-provider'

const Field = ({ fieldKey, value, onChange, secretShown, toggleSecret }) => {
  const spec = FIELD_CATALOG[fieldKey]
  if (!spec) return null
  const common = 'w-full h-10 bg-foreground/[0.03] border-foreground/10 text-sm rounded-md px-3'
  if (spec.type === 'switch') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-foreground/5 bg-foreground/[0.02] px-3 py-2.5">
        <div>
          <div className="text-sm">{spec.label}</div>
        </div>
        <Switch checked={!!value} onCheckedChange={(v) => onChange(fieldKey, v)} />
      </div>
    )
  }
  if (spec.type === 'select') {
    return (
      <div>
        <Label className="text-xs text-foreground/60">{spec.label}</Label>
        <select value={value || ''} onChange={(e) => onChange(fieldKey, e.target.value)} className={`${common} mt-1.5 focus:outline-none focus:border-foreground/25`}>
          <option value="">Select…</option>
          {spec.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  if (spec.type === 'secret') {
    return (
      <div>
        <Label className="text-xs text-foreground/60">{spec.label}</Label>
        <div className="relative mt-1.5">
          <Input type={secretShown ? 'text' : 'password'} value={value || ''} onChange={(e) => onChange(fieldKey, e.target.value)} placeholder={spec.placeholder} className="h-10 pr-10 bg-foreground/[0.03] border-foreground/10 font-mono text-sm" />
          <button type="button" onClick={toggleSecret} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">
            {secretShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div>
      <Label className="text-xs text-foreground/60">{spec.label}</Label>
      <Input type={spec.type === 'number' ? 'number' : 'text'} value={value ?? spec.default ?? ''} onChange={(e) => onChange(fieldKey, e.target.value)} placeholder={spec.placeholder} className="h-10 mt-1.5 bg-foreground/[0.03] border-foreground/10 text-sm" />
    </div>
  )
}

const TestStep = ({ step, state }) => {
  const StatusIcon = state === 'ok' ? Check : state === 'err' ? AlertCircle : Loader2
  const color = state === 'ok' ? '#22c55e' : state === 'err' ? '#ef4444' : '#a3a3a3'
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 py-1.5">
      <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}55` }}>
        <StatusIcon className={`h-3.5 w-3.5 ${state === 'pending' ? 'animate-spin' : ''}`} style={{ color }} />
      </div>
      <span className="text-sm" style={{ color: state === 'pending' ? 'rgba(255,255,255,0.7)' : color }}>{step.label}</span>
    </motion.div>
  )
}

export function AttendanceModal({ provider, existing, onClose }) {
  const { brand } = useBrand()
  const [config, setConfig] = useState(() => existing?.config || { providerName: provider.name, deviceName: `${provider.name} · Front Desk`, timezone: 'America/Los_Angeles', attendanceMode: 'Both', realtimeSync: true, automaticSync: true, syncFrequency: '1 minute', connectionTimeout: 30, retryAttempts: 3 })
  const [showSecrets, setShowSecrets] = useState({})
  const [expanded, setExpanded] = useState(false)
  const [testing, setTesting] = useState(false)
  const [stepStates, setStepStates] = useState({})
  const [result, setResult] = useState(null) // 'ok' | 'err' | null
  const [deviceInfo, setDeviceInfo] = useState(existing?.device || null)

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const runTest = async ({ shouldSucceed = true } = {}) => {
    setTesting(true); setResult(null); setStepStates({})
    for (let i = 0; i < TEST_STEPS.length; i++) {
      const step = TEST_STEPS[i]
      setStepStates(s => ({ ...s, [step.key]: 'pending' }))
      await new Promise(r => setTimeout(r, step.delay))
      const isLast = i === TEST_STEPS.length - 1
      const willFail = !shouldSucceed && isLast
      setStepStates(s => ({ ...s, [step.key]: willFail ? 'err' : 'ok' }))
    }
    if (shouldSucceed) {
      const info = mockDeviceInfo(provider)
      setDeviceInfo(info)
      setResult('ok')
    } else setResult('err')
    setTesting(false)
  }

  const save = () => {
    saveConnection(provider.id, { providerId: provider.id, config, device: deviceInfo || mockDeviceInfo(provider) })
    toast.success(`${provider.name} connected`)
    onClose()
  }

  const allFields = [...provider.fields, ...(expanded ? provider.optional : [])]

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 20 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 inset-0 flex items-start md:items-center justify-center p-3 md:p-8 pointer-events-none">
        <div className="pointer-events-auto bg-card w-full max-w-4xl max-h-[92vh] rounded-2xl border border-foreground/10 overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="relative p-6 border-b border-foreground/5 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${provider.color}15, transparent 60%)` }}>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center font-display font-bold text-lg" style={{ background: `${provider.color}25`, border: `1px solid ${provider.color}55`, color: provider.color }}>{provider.logo}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl font-bold tracking-tight">Connect {provider.name}</div>
              <div className="text-xs text-foreground/50">{provider.description}</div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
              {/* Form */}
              <div className="p-6 space-y-4">
                <div className="text-xs uppercase tracking-widest text-foreground/40">Configuration</div>
                <div className="space-y-3">
                  {allFields.map((f) => (
                    <Field key={f} fieldKey={f} value={config[f]} onChange={set} secretShown={showSecrets[f]} toggleSecret={() => setShowSecrets(s => ({ ...s, [f]: !s[f] }))} />
                  ))}
                </div>
                {provider.optional.length > 0 && (
                  <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground mt-3">
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expanded ? 'Hide' : 'Show'} advanced ({provider.optional.length} more)
                  </button>
                )}
              </div>

              {/* Test + Device info */}
              <div className="p-6 bg-black/40">
                <div className="text-xs uppercase tracking-widest text-foreground/40 mb-3">Test connection</div>
                <div className="rounded-xl border border-foreground/5 bg-black/40 p-4 min-h-[220px]">
                  {!testing && !result && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                      <Zap className="h-8 w-8 mb-3" style={{ color: brand.primaryColor }} />
                      <div className="text-sm text-foreground/70">Run a test handshake before saving</div>
                      <div className="text-xs text-foreground/40 mt-1">Simulates the exact flow a real device would use</div>
                    </div>
                  )}
                  {(testing || result) && (
                    <div className="space-y-1">
                      {TEST_STEPS.map((step) => stepStates[step.key] && <TestStep key={step.key} step={step} state={stepStates[step.key]} />)}
                      {result === 'ok' && <div className="mt-4 text-xs px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">✓ Connection successful</div>}
                      {result === 'err' && <div className="mt-4 text-xs px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400">✗ Connection failed at the final handshake step</div>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => runTest({ shouldSucceed: true })} disabled={testing} variant="outline" className="flex-1 bg-foreground/[0.03] border-foreground/10 h-9 text-xs">Simulate success</Button>
                  <Button size="sm" onClick={() => runTest({ shouldSucceed: false })} disabled={testing} variant="outline" className="flex-1 bg-foreground/[0.03] border-foreground/10 h-9 text-xs">Simulate failure</Button>
                </div>

                {deviceInfo && result === 'ok' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <div className="text-xs uppercase tracking-widest text-foreground/40 mb-2">Device</div>
                    <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 space-y-2 text-xs">
                      {[
                        { icon: Cpu,     l: 'Device',       v: deviceInfo.deviceName },
                        { icon: MapPin,  l: 'Model',        v: deviceInfo.model },
                        { icon: Signal,  l: 'Firmware',     v: deviceInfo.firmware },
                        { icon: Wifi,    l: 'IP address',   v: deviceInfo.ipAddress },
                        { icon: Check,   l: 'Check-ins',    v: `${deviceInfo.checkInsToday} today` },
                        { icon: Check,   l: 'Check-outs',   v: `${deviceInfo.checkOutsToday} today` },
                        { icon: Clock,   l: 'Device time',  v: deviceInfo.deviceTime },
                        deviceInfo.battery && { icon: Battery, l: 'Battery', v: `${deviceInfo.battery}%` },
                      ].filter(Boolean).map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <r.icon className="h-3.5 w-3.5 text-foreground/40" />
                          <span className="text-foreground/50 w-24">{r.l}</span>
                          <span className="text-foreground font-mono">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-foreground/5 flex items-center justify-between gap-2">
            <div className="text-[10px] text-foreground/40">Provider ID: <span className="font-mono text-foreground/60">{provider.id}</span></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="bg-foreground/[0.03] border-foreground/10">Cancel</Button>
              <Button onClick={save} disabled={!result || result === 'err'} className="text-foreground border-0" style={{ background: result === 'ok' ? brand.primaryColor : '#333' }}>Save connection</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
