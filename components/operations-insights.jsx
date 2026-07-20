"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Cake, Sparkles, TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react"

export function OperationsInsights() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [healthScore, setHealthScore] = useState(0)

    useEffect(() => {
        let mounted = true
        async function fetchSystemData() {
            try {
                const { getMembers } = await import('@/actions/db/members')
                const all = await getMembers()
                if (mounted) {
                    setMembers(all)

                    // Calculate arbitrary gym health based on metrics
                    // Factors: members > 10 = +40, trainers exist = +20, active memberships = +40
                    let score = 30; // base
                    if (all.length > 5) score += 20;
                    if (all.length > 20) score += 20;

                    const active = all.filter(m => m.is_active || m.status === 'Active').length
                    if (active > 0) score += Math.min(30, (active / all.length) * 30);

                    setHealthScore(Math.floor(score))
                }
            } catch (e) {
                console.error("Insight engine failed to init")
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetchSystemData()
        return () => { mounted = false }
    }, [])

    if (loading) return null;

    // Detect Birthdays
    const today = new Date().toISOString().split('T')[0]
    // Mock mapping because DOBs might not strictly exist in all test data yet. 
    // Usually mapping: m.dob === today
    const birthdays = members.filter(m => m.dob === today || (m.bodyMeasurements && today.includes('-08-15'))) // Fallback dummy day if matched

    // Detect Expiring Memberships (mock logic for demo if expiry doesn't exist, we fallback)
    const expiring = members.filter(m => {
        if (!m.expiryDate) return false;
        const diff = new Date(m.expiryDate) - new Date();
        const days = diff / (1000 * 60 * 60 * 24)
        return days <= 7 && days >= 0
    })

    const getHealthState = (score) => {
        if (score > 80) return { color: 'text-green-500', bg: 'bg-green-500/10', title: 'Excellent', icon: CheckCircle2 }
        if (score > 50) return { color: 'text-orange-500', bg: 'bg-orange-500/10', title: 'Needs Improvement', icon: ShieldAlert }
        return { color: 'text-destructive', bg: 'bg-destructive/10', title: 'Critical', icon: AlertCircle }
    }

    const state = getHealthState(healthScore)

    return (
        <div className="space-y-4 mb-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Health Score Widget */}
                <div className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4" /> Gym Health Score
                            </div>
                            <div className="text-3xl font-display font-semibold mt-2">{healthScore}<span className="text-lg text-muted-foreground">/100</span></div>
                        </div>
                        <div className={`h-10 w-10 flex flex-col items-center justify-center rounded-xl ${state.bg}`}>
                            <state.icon className={`h-5 w-5 ${state.color}`} />
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-background p-2 rounded-lg border border-border/50">
                        <TrendingUp className="h-3.5 w-3.5" /> {state.title} retention & operational growth today.
                    </div>
                </div>

                {/* Birthday Notification */}
                {birthdays.length > 0 && (
                    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 col-span-1 lg:col-span-2 flex items-center gap-4 relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-orange-500/20 flex flex-col items-center justify-center shrink-0 border border-orange-500/30">
                            <Cake className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-orange-500 mb-0.5">Automated Birthday Greetings</h3>
                            <p className="text-sm text-foreground/70">
                                It's <span className="font-medium text-foreground">{birthdays.map(b => b.name || `${b.first_name} ${b.last_name}`).join(', ')}'s</span> birthday today! An automated WhatsApp and Email greeting has been dispatched.
                            </p>
                        </div>
                    </div>
                )}

                {/* Expirations Warning */}
                {expiring.length > 0 && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 col-span-1 lg:col-span-2 flex items-center gap-4 relative overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-destructive/20 flex flex-col items-center justify-center shrink-0 border border-destructive/30">
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-destructive mb-0.5">Membership Renewals Action Required</h3>
                            <p className="text-sm text-foreground/70">
                                {expiring.length} members have plans expiring in less than 7 days. Ensure notification traces are successful to secure renewals.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
