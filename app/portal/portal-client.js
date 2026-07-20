'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flame, Timer, MapPin, ChevronRight, TrendingUp, Users, Sparkles, Dumbbell } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid, CrowdHeatmap } from '@/components/zone-demand'

const stageColor = (s) => ({ Cardio: '#ef4444', Lifting: '#3b82f6', Recovery: '#10b981', CheckIn: '#f59e0b', Floor: '#8b5cf6' }[s] || '#e5e5e5')

const MEMBER_INSIGHTS = [
    { value: '5:30 AM', detail: 'Based on your history, the gym is quietest early tomorrow.' },
    { value: '1.2x', detail: 'You are crushing it. Burned more calories this week.' }
]

const Ring = ({ value, size = 180, stroke = 14, gradient }) => {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const dash = (value / 100) * c
    return (
        <svg width={size} height={size} className="-rotate-90">
            <defs>
                <linearGradient id="ringG" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor={gradient[0]} />
                    <stop offset="100%" stopColor={gradient[1]} />
                </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-white/[0.06] fill-none" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
                stroke="url(#ringG)" fill="none"
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${dash} ${c}` }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
            />
        </svg>
    )
}

export default function PortalClient({ member, insideCount = 0, activeCheckin, zones, dailyLine }) {
    const { brand } = useBrand()
    const capacity = 80
    const occ = Math.round((insideCount / capacity) * 100)
    const [sec, setSec] = useState(0)
    useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t) }, [])

    // Real active session mapping
    const isLive = !!activeCheckin
    let checkinTime = 'N/A'
    let progress = 0
    let mm = '00', ss = '00'
    let caloriesEst = 0

    if (isLive) {
        const ci = new Date(activeCheckin.check_in_time || activeCheckin.checkIn)
        checkinTime = ci.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const elapsed = Math.floor((new Date() - ci) / 1000)
        mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
        ss = String(elapsed % 60).padStart(2, '0')
        progress = Math.min(100, Math.round((elapsed / 3600) * 100)) // assuming 1 hour session = 100%
        caloriesEst = Math.round((elapsed / 60) * 6.5) // ~6.5 cals per min
    }

    const ME = {
        name: member?.name || member?.first_name ? `${member?.first_name || ''} ${member?.last_name || ''}`.trim() : 'Member',
        plan: member?.plan || member?.membershipPlan || member?.membershipStatus || 'Basic Suite',
        photo: member?.photo_url || `https://i.pravatar.cc/150?u=${member?.email}`,
        stage: 'Floor',
        progress: progress,
        todayWorkout: member?.workoutSplit || member?.goal || 'Full Body Sculpt',
        checkinTime: checkinTime,
        eta: isLive ? `${60 - parseInt(mm)} mins` : 'Offline',
        caloriesEst: caloriesEst
    }

    // Compute Streak & Monthly Visits
    let streakDays = 0;
    let thisMonthVisits = 0;

    if (Array.isArray(member?.attendance)) {
        const sorted = member.attendance
            .map(a => new Date(a.checkIn || a.check_in_time))
            .sort((a, b) => b - a);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        thisMonthVisits = sorted.filter(d => d.getMonth() === currentMonth && d.getFullYear() === currentYear).length;

        // Basic streak
        let lastDay = new Date(now.toDateString());
        for (const logDate of sorted) {
            const dateOnly = new Date(logDate.toDateString());
            const diffDays = Math.floor((lastDay - dateOnly) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) continue; // Same day
            if (diffDays === 1) {
                streakDays++;
                lastDay = dateOnly;
            } else if (diffDays > 1) {
                break;
            }
        }
        // Account for checking in today
        if (sorted.length > 0) {
            const log0 = new Date(sorted[0].toDateString());
            const today = new Date(now.toDateString());
            if (log0.getTime() === today.getTime() && streakDays === 0) streakDays = 1;
        }
    }

    // Prepare Crowd Heatmap data from generic dailyLine
    let customHeatmap = [];
    if (dailyLine && dailyLine.length > 0) {
        const mapped = [6, 9, 12, 17, 20, 22]; // Hours we want to show
        customHeatmap = mapped.map(h => {
            const pt = dailyLine.find((d, i) => i + 6 === h);
            const val = pt ? pt.v : 0;
            const hrFmt = h > 12 ? `${h - 12} PM` : `${h} AM`;
            const perc = Math.min(100, Math.round((val / capacity) * 100) || 5);
            let lvl = 'Low', dot = '🟢', clr = '#10b981';
            if (perc > 60) { lvl = 'Busy'; dot = '🟡'; clr = '#f59e0b'; }
            if (perc > 85) { lvl = 'Peak'; dot = '🔴'; clr = '#ef4444'; }
            return { time: hrFmt, level: lvl, percent: perc, dot: dot, color: clr };
        });
    }

    const topInsights = MEMBER_INSIGHTS.slice(0, 2)

    return (
        <PortalShell title="Home">
            <div className="mb-6">
                <div className="text-sm text-foreground/50">Good evening,</div>
                <div className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-0.5">{ME.name.split(' ')[0]} 👋</div>
                <div className="text-xs text-foreground/40 mt-1">Training at <span className="text-foreground/70">{brand.gymName}</span></div>
            </div>

            {isLive ? (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden border border-foreground/10 mb-4" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}18 0%, transparent 60%), radial-gradient(circle at 100% 0%, ${brand.primaryColor}30, transparent 50%)` }}>
                    <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: brand.primaryColor }} />
                    <div className="relative p-6 md:p-8">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
                            <span className="h-1.5 w-1.5 rounded-full pulse-red" style={{ background: brand.primaryColor }} />
                            Live workout · Checked in {ME.checkinTime}
                        </div>
                        <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-8">
                            <div className="flex items-center justify-center relative">
                                <Ring value={ME.progress} gradient={[brand.primaryColor, brand.accentColor]} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-[10px] uppercase tracking-widest text-foreground/50">Progress</div>
                                    <div className="font-display text-4xl font-bold">{ME.progress}%</div>
                                    <div className="text-[10px] mt-1" style={{ color: stageColor(ME.stage) }}>{ME.stage}</div>
                                </div>
                            </div>
                            <div className="flex-1 mt-6 md:mt-0">
                                <div className="flex items-center gap-2">
                                    <Flame className="h-5 w-5" style={{ color: brand.primaryColor }} />
                                    <div className="font-display text-xl md:text-2xl font-semibold">{ME.todayWorkout}</div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-black/40 border border-foreground/5 p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-foreground/40">Timer</div>
                                        <div className="font-display text-xl font-bold mt-1 tabular-nums">{mm}:{ss}</div>
                                    </div>
                                    <div className="rounded-2xl bg-black/40 border border-foreground/5 p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-foreground/40">Cals</div>
                                        <div className="font-display text-xl font-bold mt-1">{ME.caloriesEst}</div>
                                    </div>
                                    <div className="rounded-2xl bg-black/40 border border-foreground/5 p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-foreground/40">ETA</div>
                                        <div className="font-display text-xl font-bold mt-1">{ME.eta.split(' ')[0]}</div>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-foreground/60">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>Training <span className="text-foreground">Chest zone</span> · currently very busy · your session is peaking</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-8 mb-4 text-center">
                    <div className="text-foreground/40 mb-2">You are currently offline.</div>
                    <div className="text-sm">Scan the QR code at the front desk to start your session.</div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
                <Link href="/portal/live" className="group rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5 hover:border-foreground/15 transition">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.primaryColor}20` }}>
                                <Users className="h-4 w-4" style={{ color: brand.primaryColor }} />
                            </div>
                            <span className="text-sm font-medium">Live occupancy</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-foreground/70 transition" />
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="font-display text-5xl font-bold tracking-tight">{insideCount}</span>
                        <span className="text-foreground/40">/ {capacity}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${occ}%` }} transition={{ duration: 1.2 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }} />
                        </div>
                        <span className="text-xs font-semibold">{occ}%</span>
                    </div>
                    <div className="mt-3 text-xs text-foreground/50">Busy right now — peak in ~30 min</div>
                </Link>

                <Link href="/portal/insights" className="group rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5 hover:border-foreground/15 transition relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40" style={{ background: brand.primaryColor }} />
                    <div className="relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${brand.primaryColor}20` }}>
                                    <Sparkles className="h-4 w-4" style={{ color: brand.primaryColor }} />
                                </div>
                                <span className="text-sm font-medium">AI insight for you</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-foreground/70 transition" />
                        </div>
                        <div className="mt-4">
                            <div className="text-xs text-foreground/40">Best time to visit tomorrow</div>
                            <div className="font-display text-3xl font-bold mt-1">{topInsights[0].value}</div>
                            <div className="text-xs text-foreground/50 mt-2 leading-relaxed line-clamp-2">{topInsights[0].detail}</div>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} />
                        <div className="text-sm font-medium">Workout Zone Demand</div>
                    </div>
                    <Link href="/portal/live" className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1">See all <ChevronRight className="h-3 w-3" /></Link>
                </div>
                <ZoneDemandGrid compact zones={zones} />
            </div>

            <div className="mt-6 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-5">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Crowd today</div></div>
                <div className="text-xs text-foreground/50 mb-4">Live analytics from <span className="text-foreground font-semibold">{brand.gymName}</span></div>
                <CrowdHeatmap overrideData={customHeatmap} />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                    { href: '/portal/attendance', label: 'This month', val: `${thisMonthVisits} days`, icon: TrendingUp },
                    { href: '/portal/membership', label: 'Membership', val: ME.plan, icon: MapPin },
                    { href: '/portal/profile', label: 'Streak', val: `${streakDays} days`, icon: Flame },
                ].map((t, i) => (
                    <Link key={i} href={t.href} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 hover:border-foreground/15 transition">
                        <t.icon className="h-4 w-4 text-foreground/50" />
                        <div className="text-[10px] text-foreground/50 uppercase tracking-widest mt-2">{t.label}</div>
                        <div className="font-display font-bold mt-0.5 truncate">{t.val}</div>
                    </Link>
                ))}
            </div>
        </PortalShell >
    )
}
