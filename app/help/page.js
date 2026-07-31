"use client"

import { DashShell } from '@/components/dash-shell'
import { PlayCircle, FileText, Settings, CreditCard, LifeBuoy, Zap, ChevronRight, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function HelpCenter() {
    const categories = [
        { title: "Getting Started", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
        { title: "Member Management", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Billing & Subscriptions", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { title: "Hardware Integration", icon: Settings, color: "text-purple-500", bg: "bg-purple-500/10" }
    ]

    return (
        <DashShell title="Help Center" subtitle="Learn how to optimize your operations with GymOS">
            <div className="max-w-4xl space-y-6">

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <PlayCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">Video Tutorials</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-[80%]">Watch quick mastery guides on maximizing the AI engine and operational flow.</p>
                        <button className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">Coming Soon (Q3)</button>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                            <MessageSquare className="h-6 w-6 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-lg">Contact Support</h3>
                        <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-[80%]">Having issues or need a bespoke engineering request? Our engineers are on standby.</p>
                        <button className="text-xs bg-foreground text-background px-4 py-2 rounded-lg font-medium hover:opacity-90">Open Support Ticket</button>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4">Documentation Categories</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {categories.map(c => (
                            <div key={c.title} className="flex items-center gap-4 p-3 rounded-xl hover:bg-foreground/[0.02] border border-transparent hover:border-border transition-all cursor-not-allowed opacity-50 grayscale" title="Documentation rolling out soon">
                                <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${c.bg}`}>
                                    <c.icon className={`h-5 w-5 ${c.color}`} />
                                </div>
                                <div className="flex-1 font-medium text-sm">{c.title}</div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </DashShell>
    )
}
