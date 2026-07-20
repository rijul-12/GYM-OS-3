"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Clock, ShieldAlert, Zap, Server, Shield, User } from "lucide-react"

export function RecentActivityTimeline({ gymCode }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true;
        const fetchLogs = async () => {
            try {
                const { getRecentActivity } = await import('@/actions/db/activity')
                // Super Admins usually look at DEMO code, but they can see all platform-wide maybe? Wait, it filters by gymCode.
                // If it's SA looking globally, gymCode might be undefined. Let's handle it upstream.
                const data = await getRecentActivity(gymCode, 15)
                if (mounted) setLogs(data)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetchLogs()
        return () => { mounted = false }
    }, [gymCode])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-border bg-card">
                <Server className="h-6 w-6 animate-pulse text-muted-foreground mb-3" />
                <div className="text-sm font-medium text-muted-foreground">Pulling activity streams...</div>
            </div>
        )
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-border/50 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="text-sm font-medium">No Recent Activity</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Your timeline is quiet.</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Live Operational Timeline</span>
                </div>
            </div>

            <div className="p-2 space-y-1 max-h-[350px] overflow-y-auto">
                {logs.map((log, i) => {
                    const isSystem = log.actorRole === 'system'
                    const isSA = log.actorRole === 'super_admin'

                    return (
                        <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={log.id || i} className="flex gap-4 p-3 hover:bg-background/40 rounded-xl transition-colors">
                            <div className="mt-0.5 relative">
                                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border shadow-sm ${isSA ? 'bg-purple-500/10 border-purple-500/30' : isSystem ? 'bg-orange-500/10 border-orange-500/30' : 'bg-primary/10 border-primary/30'}`}>
                                    {isSA ? <ShieldAlert className="h-3.5 w-3.5 text-purple-500" /> : isSystem ? <Zap className="h-3.5 w-3.5 text-orange-500" /> : <User className="h-3.5 w-3.5 text-primary" />}
                                </div>
                                {i !== logs.length - 1 && <div className="absolute top-9 bottom-[-16px] left-[15px] border-l-2 border-border/60 border-dashed" />}
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground flex gap-2 mb-1">
                                    <span className="font-semibold text-foreground/80">{log.actorEmail}</span>
                                    <span>•</span>
                                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-sm font-medium">{log.actionType}</div>
                                {log.details && <div className="text-xs text-muted-foreground mt-1 max-w-[90%] leading-relaxed">{log.details}</div>}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
