'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, Check, X as XIcon, RotateCw, LogIn, LogOut } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { useBrand } from '@/components/brand-provider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SOURCE_META } from '@/lib/attendance/mock-logs'

const STATUS_STYLE = {
    Success: { bg: 'rgba(34,197,94,0.10)', color: '#22c55e', icon: Check },
    Failed: { bg: 'rgba(239,68,68,0.10)', color: '#ef4444', icon: XIcon },
    Retry: { bg: 'rgba(249,115,22,0.10)', color: '#f97316', icon: RotateCw },
}

export default function AttendanceLogsClient({ initialLogs }) {
    const { brand } = useBrand()
    const [q, setQ] = useState('')
    const [source, setSource] = useState('All')
    const [status, setStatus] = useState('All')

    // We map the Supabase attendance table directly into the visual UI schema
    const rows = useMemo(() => {
        const syntheticLogs = []
        initialLogs.forEach(a => {
            syntheticLogs.push({
                id: a.id + '-in',
                member: a.members?.name || 'Unknown',
                time: new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date(a.check_in_time).toLocaleDateString(),
                type: 'Check In',
                plannedWorkout: Array.isArray(a.planned_workout) ? a.planned_workout.filter(Boolean).join(', ') : (a.planned_workout || '-'),
                actualWorkout: Array.isArray(a.actual_workout) ? a.actual_workout.filter(Boolean).join(', ') : (a.actual_workout || '-'),
                status: 'Success',
            })
            // If checked out, append a checkout visual log
            if (a.check_out_time) {
                syntheticLogs.push({
                    id: a.id + '-out',
                    member: a.members?.name || 'Unknown',
                    time: new Date(a.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(a.check_out_time).toLocaleDateString(),
                    type: 'Check Out',
                    plannedWorkout: Array.isArray(a.planned_workout) ? a.planned_workout.filter(Boolean).join(', ') : (a.planned_workout || '-'),
                    actualWorkout: Array.isArray(a.actual_workout) ? a.actual_workout.filter(Boolean).join(', ') : (a.actual_workout || '-'),
                    status: 'Success',
                })
            }
        })
        return syntheticLogs.sort((a, b) => new Date(b.time) - new Date(a.time))
    }, [initialLogs])

    const filtered = useMemo(() => rows.filter(r =>
        r.member.toLowerCase().includes(q.toLowerCase()) &&
        (source === 'All' || r.source === source) &&
        (status === 'All' || r.status === status)
    ), [rows, q, source, status])

    const counts = useMemo(() => ({
        total: rows.length,
        success: rows.filter(r => r.status === 'Success').length,
        failed: rows.filter(r => r.status === 'Failed').length,
        retry: rows.filter(r => r.status === 'Retry').length,
    }), [rows])

    const exportCSV = () => {
        if (!filtered.length) return toast.error("No data available to export.")
        const headers = ['Date', 'Time', 'Member', 'Planned Workout', 'Actual Workout', 'Type', 'Status']
        const csvContent = [
            headers.join(','),
            ...filtered.map(r => `"${r.date}","${r.time}","${r.member}","${r.plannedWorkout}","${r.actualWorkout}","${r.type}","${r.status}"`)
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `BGM_Attendance_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        toast.success(`Exported ${filtered.length} rows successfully`)
    }

    return (
        <DashShell title="Attendance Logs" subtitle="Every check-in, check-out, retry and failure across all providers" actions={<Button onClick={exportCSV} variant="outline" className="h-10 bg-foreground/[0.03] border-foreground/10 text-xs"><Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV</Button>}>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { l: 'Total events', v: counts.total, c: '#a3a3a3' },
                    { l: 'Successful', v: counts.success, c: '#22c55e' },
                    { l: 'Failed', v: counts.failed, c: '#ef4444' },
                    { l: 'Retry pending', v: counts.retry, c: '#f97316' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4">
                        <div className="h-1.5 w-8 rounded-full mb-3" style={{ background: s.c }} />
                        <div className="text-[10px] uppercase tracking-widest text-foreground/50">{s.l}</div>
                        <div className="font-display text-2xl font-bold mt-1">{s.v}</div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-lg px-3 py-2 flex-1 min-w-[220px]">
                    <Search className="h-4 w-4 text-foreground/40" />
                    <input placeholder="Search member" value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent outline-none text-sm flex-1" />
                </div>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-lg bg-foreground/[0.03] border border-foreground/10 px-3 text-sm">
                    <option>All</option>
                    {SOURCE_META.map(s => <option key={s.id}>{s.label}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg bg-foreground/[0.03] border border-foreground/10 px-3 text-sm">
                    <option>All</option>
                    <option>Success</option>
                    <option>Failed</option>
                    <option>Retry</option>
                </select>
            </div>

            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="text-xs font-semibold text-foreground/50 border-b border-foreground/10 sticky top-0 bg-background">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Date</th>
                                <th className="text-left px-4 py-3 font-medium">Time</th>
                                <th className="text-left px-4 py-3 font-medium">Member</th>
                                <th className="text-left px-4 py-3 font-medium">Planned Workout</th>
                                <th className="text-left px-4 py-3 font-medium">Actual Workout</th>
                                <th className="text-left px-4 py-3 font-medium">Type</th>
                                <th className="text-left px-4 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!filtered.length ? (
                                <tr>
                                    <td colSpan="7" className="text-center p-8 text-foreground/40 text-sm">
                                        No attendance logs found right now.
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {filtered.slice(0, 40).map((r) => {
                                        const S = STATUS_STYLE[r.status]
                                        const SIcon = S.icon
                                        return (
                                            <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-foreground/5 hover:bg-foreground/[0.02]">
                                                <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{r.date}</td>
                                                <td className="px-4 py-3 text-foreground/70 font-mono text-xs">{r.time}</td>
                                                <td className="px-4 py-3">{r.member}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-foreground/60">{r.plannedWorkout || 'Rest Day'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-semibold" style={{ color: (r.actualWorkout === r.plannedWorkout && r.actualWorkout) ? '#22c55e' : brand.primaryColor }}>
                                                        {r.actualWorkout || 'Rest Day'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-foreground/[0.05] text-foreground/80">
                                                        {r.type === 'Check In' ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                                                        {r.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: S.bg, color: S.color }}>
                                                        <SIcon className={`h-3 w-3 ${r.status === 'Retry' ? 'animate-spin' : ''}`} /> {r.status}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        )
                                    })}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 border-t border-foreground/5 flex items-center justify-between text-xs text-foreground/50">
                    <div>Showing {Math.min(filtered.length, 40)} of {filtered.length} events</div>
                    <div>Live tail· refresh every 3s</div>
                </div>
            </div>
        </DashShell>
    )
}
