"use client"

import { SuperAdminShell } from '@/components/superadmin-shell'
import { Server, Database, Activity, ShieldCheck, Mail, Bell, CheckCircle2, ChevronRight, Key } from 'lucide-react'

export default function SystemHealth() {
    const services = [
        { name: "Firebase Edge Config", uptime: "Operational", ping: "Active", icon: Database, color: "text-orange-500", bg: "bg-orange-500/10" },
        { name: "Auth & Identity", uptime: "Operational", ping: "Active", icon: Key, color: "text-blue-500", bg: "bg-blue-500/10" },
        { name: "File Storage", uptime: "Operational", ping: "Active", icon: Server, color: "text-purple-500", bg: "bg-purple-500/10" },
        { name: "Transactional Emails", uptime: "Operational", ping: "Active", icon: Mail, color: "text-amber-500", bg: "bg-amber-500/10" },
        { name: "WebSocket Presence", uptime: "Operational", ping: "Active", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { name: "FCM Push Notifications", uptime: "Operational", ping: "Active", icon: Bell, color: "text-rose-500", bg: "bg-rose-500/10" }
    ]

    return (
        <SuperAdminShell title="System Health" subtitle="Platform operational status and active incidents">
            <div className="max-w-5xl space-y-6 animate-in fade-in">

                {/* Global Status Banner */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span className="absolute inline-flex h-3 w-3 top-[-2px] right-[2px] rounded-full bg-emerald-500 opacity-75 animate-ping" />
                            <span className="absolute inline-flex h-2.5 w-2.5 top-[0px] right-[4px] rounded-full bg-emerald-500" />
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-emerald-500">All Systems Operational</h2>
                            <p className="text-sm text-foreground/60">Global infrastructure is nominal. No active incidents reported in the last 24 hours.</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(s => (
                        <div key={s.name} className="rounded-2xl border border-border bg-card p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${s.bg}`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                                <div className="font-semibold">{s.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-background rounded-lg p-2 border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-0.5">Uptime</div>
                                    <div className="font-mono font-medium text-emerald-500">{s.uptime}</div>
                                </div>
                                <div className="bg-background rounded-lg p-2 border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-0.5">Latency</div>
                                    <div className="font-mono font-medium text-foreground">{s.ping}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </SuperAdminShell>
    )
}
