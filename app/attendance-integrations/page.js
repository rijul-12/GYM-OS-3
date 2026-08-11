'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Settings, Trash2, RefreshCw, Check, Search, Plug, PlugZap, Filter } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { PROVIDERS } from '@/lib/attendance/providers'
import { getConnections, removeConnection, touchSync } from '@/lib/attendance/store'
import { AttendanceModal } from '@/components/attendance-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const CATS = ['All', 'QR', 'Manual', 'Biometric', 'Face', 'Cards', 'API']
const catMatch = (p, c) => c === 'All' || (c === 'QR' && p.category === 'qr') || (c === 'Manual' && p.category === 'manual') || (c === 'Biometric' && p.category === 'biometric') || (c === 'Face' && p.category === 'face') || (c === 'Cards' && p.category === 'card') || (c === 'API' && p.category === 'api')

function App() {
  const { brand } = useBrand()
  const [connections, setConnections] = useState({})
  const [selected, setSelected] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')

  useEffect(() => {
    const refresh = () => setConnections(getConnections())
    refresh()
    window.addEventListener('gymos:connections-changed', refresh)
    return () => window.removeEventListener('gymos:connections-changed', refresh)
  }, [])

  const filtered = PROVIDERS.filter(p => catMatch(p, cat) && p.name.toLowerCase().includes(q.toLowerCase()))
  const total = Object.keys(connections).length

  return (
    <DashShell title="Attendance Integrations" subtitle="Connect any provider · QR, biometric, face, NFC, RFID, custom API" actions={<div className="text-xs px-2.5 py-1 rounded-md bg-foreground/[0.04] border border-foreground/10 flex items-center gap-1.5"><PlugZap className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} /> {total} connected</div>}>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-foreground/40" />
          <input placeholder="Search providers" value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent outline-none text-sm flex-1" />
        </div>
        <div className="flex gap-1 bg-foreground/[0.03] border border-foreground/10 rounded-lg p-1 flex-wrap">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${cat === c ? 'text-foreground' : 'text-foreground/50 hover:text-foreground'}`} style={cat === c ? { background: brand.primaryColor } : {}}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, i) => {
          const conn = connections[p.id]
          const connected = !!conn && !p.disabled
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-2xl border p-5 relative overflow-hidden card-hover" style={{ borderColor: connected ? `${p.color}55` : 'rgba(255,255,255,0.06)', background: connected ? `linear-gradient(135deg, ${p.color}0d, transparent 60%)` : 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center font-display font-bold text-sm" style={{ background: `${p.color}22`, border: `1px solid ${p.color}55`, color: p.color }}>{p.logo}</div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-foreground/50'}`}>
                  {connected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-red" />}
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="font-display font-semibold">{p.name}</div>
              <div className="text-xs text-foreground/50 mt-0.5">{p.tagline}</div>

              {connected && (
                <div className="mt-4 rounded-xl border border-foreground/5 bg-black/40 p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-foreground/40">Device</span><span className="text-foreground/90 truncate ml-2">{conn.device?.deviceName}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/40">Firmware</span><span className="text-foreground/90 font-mono">{conn.device?.firmware}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/40">Last sync</span><span className="text-foreground/90">{timeAgo(conn.lastSync)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-foreground/40">Health</span><span className="flex items-center gap-1 text-emerald-400"><Check className="h-3 w-3" /> {conn.device?.health || 'Excellent'}</span></div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {!connected ? (
                  <Button size="sm" onClick={() => setSelected(p)} className="h-8 text-xs text-foreground border-0" style={{ background: brand.primaryColor }}><Plug className="h-3 w-3 mr-1" /> Connect</Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => { touchSync(p.id); toast.success(`${p.name} synced`) }} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><RefreshCw className="h-3 w-3 mr-1" /> Sync now</Button>
                    <Button size="sm" onClick={() => setSelected(p)} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Settings className="h-3 w-3 mr-1" /> Settings</Button>
                    <Button size="sm" onClick={() => setSelected(p)} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Zap className="h-3 w-3 mr-1" /> Test</Button>
                    <Button size="sm" onClick={() => { removeConnection(p.id); toast.success(`${p.name} disconnected`) }} variant="outline" className="h-8 text-xs bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3 mr-1" /> Disconnect</Button>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Architecture note */}
      <div className="mt-8 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 text-xs text-foreground/60 leading-relaxed">
        <div className="font-display text-sm text-foreground font-semibold mb-1">Provider-agnostic architecture</div>
        Every provider implements the same interface — <span className="font-mono text-foreground/80">connect() · disconnect() · test() · sync()</span>. The attendance engine only talks to this interface, so adding <span className="text-foreground">Apple Wallet, Google Wallet, turnstiles, mobile check-in, CSV/Excel import</span> or any future provider means adding one registry entry — no changes to business logic, UI, or logs pipeline.
      </div>

      {selected && <AttendanceModal provider={selected} existing={connections[selected.id]} onClose={() => setSelected(null)} />}
    </DashShell>
  )
}

export default App
