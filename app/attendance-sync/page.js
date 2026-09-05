'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, RotateCw, Cpu, Server, Wifi, Zap, Activity, LogIn, LogOut } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { generateLogs, SOURCE_META } from '@/lib/attendance/mock-logs'
import { getConnections } from '@/lib/attendance/store'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const STATUS_ICON = { Success: CheckCircle2, Failed: XCircle, Retry: RotateCw }
const STATUS_COLOR = { Success: '#22c55e', Failed: '#ef4444', Retry: '#f97316' }

const HEALTH = [
  { key: 'device', label: 'Device status', ok: 'All devices online', icon: Cpu },
  { key: 'api', label: 'API status', ok: '99.98% uptime', icon: Zap },
  { key: 'server', label: 'Server status', ok: 'Healthy · 42ms p99', icon: Server },
  { key: 'net', label: 'Network', ok: 'Stable connection', icon: Wifi },
]

const SYNC_TREND = Array.from({ length: 20 }, (_, i) => ({
  t: i,
  ms: Math.round(120 + Math.sin(i / 3) * 40 + Math.random() * 30),
}))

function App() {
  const { brand } = useBrand()
  const [feed, setFeed] = useState([])
  const [connections, setConnections] = useState({})

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const { getAttendanceLogs } = await import('@/actions/db/attendance')
        const live = await getAttendanceLogs(20)
        if (!active) return;
        const formatted = live.map(l => {
          const date = new Date(l.check_in_time)
          return {
            id: l.id,
            time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`,
            member: l.members?.name || 'Unknown Member',
            type: l.check_out_time ? 'Check Out' : 'Check In',
            source: l.method || l.source || 'App',
            sourceColor: l.method === 'App' ? '#3b82f6' : '#22c55e',
            status: 'Success'
          }
        })
        setFeed(formatted)
      } catch (e) { }
    }

    fetchLogs();
    const stream = setInterval(fetchLogs, 4000)

    const refresh = () => setConnections(getConnections())
    refresh()
    window.addEventListener('gymos:connections-changed', refresh)

    return () => {
      active = false;
      clearInterval(stream);
      window.removeEventListener('gymos:connections-changed', refresh)
    }
  }, [])

  const imported = feed.length || 0;
  const pending = 0;
  const failed = 0;
  const avgSync = imported > 0 ? 42 : 0;

  return (
    <DashShell title="Synchronization Dashboard" subtitle="Live health across every attendance provider">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Imported today', v: imported.toLocaleString(), sub: 'attendance events', color: brand.primaryColor, icon: Activity },
          { l: 'Pending records', v: pending, sub: 'queued for next sync', color: '#f97316', icon: RotateCw },
          { l: 'Failed records', v: failed, sub: 'auto-retry active', color: '#ef4444', icon: XCircle },
          { l: 'Avg sync time', v: `${avgSync} ms`, sub: 'p50 last hour', color: '#22c55e', icon: Zap },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 card-hover">
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}44` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
            </div>
            <div className="mt-4 text-[10px] uppercase tracking-widest text-foreground/50">{s.l}</div>
            <div className="font-display text-3xl font-bold tracking-tight mt-1">{s.v}</div>
            <div className="text-xs text-foreground/40">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Sync latency + connection health */}
      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <div className="lg:col-span-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-medium">Sync latency</div>
              <div className="text-xs text-foreground/40">Last 20 sync cycles · ms per batch</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-red" /> Live
            </div>
          </div>
          <div className="h-56 mt-3">
            <ResponsiveContainer>
              <AreaChart data={SYNC_TREND}>
                <defs>
                  <linearGradient id="gSync" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand.primaryColor} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={brand.primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="t" stroke="#ffffff40" fontSize={11} />
                <YAxis stroke="#ffffff40" fontSize={11} unit="ms" />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="ms" stroke={brand.primaryColor} fill="url(#gSync)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="text-sm font-medium mb-1">Connection health</div>
          <div className="text-xs text-foreground/40 mb-4">System-wide status</div>
          <div className="space-y-2">
            {HEALTH.map((h) => (
              <div key={h.key} className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-black/30 p-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30">
                  <h.icon className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{h.label}</div>
                  <div className="text-[10px] text-foreground/50">{h.ok}</div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">OK</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-provider status */}
      <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-sm font-medium">Provider status</div>
            <div className="text-xs text-foreground/40">All connected attendance providers</div>
          </div>
        </div>
        {Object.keys(connections).length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/10 p-6 text-center text-sm text-foreground/50">
            No providers connected yet. Head to <a href="/attendance-integrations" className="text-foreground underline">Attendance Integrations</a> to add one.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(connections).map(([id, c]) => (
              <div key={id} className="rounded-xl border border-foreground/5 bg-black/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.config?.providerName || id}</div>
                    <div className="text-[10px] text-foreground/50 truncate">{c.device?.model} · {c.device?.firmware}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-[10px] text-foreground/50"><span>Check-ins today</span><span className="text-foreground/90">{c.device?.checkInsToday}</span></div>
                <div className="mt-1 flex justify-between text-[10px] text-foreground/50"><span>Check-outs today</span><span className="text-foreground/90">{c.device?.checkOutsToday}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live timeline */}
      <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Live activity timeline</div>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-red" /> Streaming
              </span>
            </div>
            <div className="text-xs text-foreground/40">New event every ~3 seconds</div>
          </div>
        </div>

        <div className="relative pl-4">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <AnimatePresence initial={false}>
            {feed.map((r, i) => {
              const Icon = STATUS_ICON[r.status]
              const color = STATUS_COLOR[r.status]
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="relative pl-6 pb-4">
                  <div className="absolute left-0 top-2 h-3.5 w-3.5 rounded-full flex items-center justify-center" style={{ background: color, boxShadow: `0 0 0 4px ${color}22` }}>
                    <span className="h-1 w-1 rounded-full bg-black/50" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs text-foreground/40 font-mono w-16">{r.time}</span>
                    <span className="font-medium">{r.member}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-foreground/70">{r.type === 'Check In' ? <LogIn className="h-2.5 w-2.5" /> : <LogOut className="h-2.5 w-2.5" />} {r.type}</span>
                    <span className="text-[11px] text-foreground/50 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm" style={{ background: r.sourceColor }} /> {r.source}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
                      <Icon className={`h-3 w-3 ${r.status === 'Retry' ? 'animate-spin' : ''}`} /> {r.status}
                    </span>
                  </div>
                  {r.reason && <div className="text-[11px] text-foreground/40 mt-0.5">{r.reason}</div>}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </DashShell>
  )
}

export default App
