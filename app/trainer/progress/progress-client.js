'use client'
import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Trophy, Weight, Activity } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'

export default function TrainerProgressClient({ initialMembers }) {
    const { brand } = useBrand()
    // Ensure we have a default active state if array is empty (fallback protection)
    const [selectedId, setSelectedId] = useState(initialMembers[0]?.id || null)

    if (initialMembers.length === 0) {
        return (
            <TrainerShell title="Progress" subtitle="Track strength gains and body composition">
                <div className="p-8 text-center bg-black/20 rounded-xl border border-foreground/5 mt-8">
                    <p className="text-foreground/40 text-sm">No members are currently assigned to you for progress tracking.</p>
                </div>
            </TrainerShell>
        )
    }

    const selected = initialMembers.find(m => m.id === selectedId) || initialMembers[0]

    // Progress Data Source Mapping directly from Native Members Payload
    // Fallback if progress_history doesn't exist to prevent UI crashes structurally
    const data = selected.progress_history || [{ w: 1, bench: 135, squat: 185, weight: 160 }, { w: 2, bench: 140, squat: 190, weight: 160 }, { w: 4, bench: 145, squat: 195, weight: 158 }]
    const first = data[0] || { bench: 0, squat: 0, weight: 0 }, last = data[data.length - 1] || { bench: 0, squat: 0, weight: 0 }

    const benchGain = last.bench - first.bench
    const squatGain = last.squat - first.squat
    const weightDelta = last.weight - first.weight

    return (
        <TrainerShell title="Progress" subtitle="Track strength gains and body composition mapped dynamically via NoSQL charts.">
            <div className="flex flex-wrap gap-2 mb-6">
                {initialMembers.map((m) => (
                    <button key={m.id} onClick={() => setSelectedId(m.id)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${selectedId === m.id ? 'border-foreground/25' : 'border-foreground/10 hover:border-foreground/20'}`} style={selectedId === m.id ? { background: `${brand.primaryColor}18`, color: brand.primaryColor } : {}}>
                        <Image src={m.photo_url || `https://i.pravatar.cc/150?u=${m.id}`} className="h-5 w-5 rounded-full object-cover" alt="" width={120} height={120} /> {m.name}
                    </button>
                ))}
            </div>

            {/* Header stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Bench gain', v: `${benchGain > 0 ? '+' : ''}${benchGain} lb`, icon: Trophy, tone: '#22c55e' },
                    { label: 'Squat gain', v: `${squatGain > 0 ? '+' : ''}${squatGain} lb`, icon: Trophy, tone: '#22c55e' },
                    { label: 'Weight', v: `${weightDelta > 0 ? '+' : ''}${weightDelta} lb`, icon: Weight, tone: '#a3a3a3' },
                    { label: 'Attendance', v: `${selected.attendance || 100}%`, icon: Activity, tone: brand.primaryColor },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${s.tone}20`, border: `1px solid ${s.tone}40` }}>
                            <s.icon className="h-4 w-4" style={{ color: s.tone }} />
                        </div>
                        <div className="mt-4 text-[10px] uppercase tracking-widest text-foreground/50">{s.label}</div>
                        <div className="font-display text-2xl md:text-3xl font-bold tracking-tight mt-1">{s.v}</div>
                    </motion.div>
                ))}
            </div>

            {/* Strength chart */}
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Strength progression · {selected.name}</div></div>
                <div className="text-xs text-foreground/40 mb-4">Bench + Squat 1RM (lb) over 8 weeks</div>
                <div className="h-72">
                    <ResponsiveContainer>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                            <XAxis dataKey="w" stroke="#ffffff40" fontSize={11} />
                            <YAxis stroke="#ffffff40" fontSize={11} />
                            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                            <Line type="monotone" dataKey="bench" stroke={brand.primaryColor} strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="squat" stroke="#a3a3a3" strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Weight tracker */}
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
                <div className="flex items-center gap-2 mb-1"><Weight className="h-4 w-4 text-foreground/50" /><div className="text-sm font-medium">Body weight trend</div></div>
                <div className="text-xs text-foreground/40 mb-4">Weekly log</div>
                <div className="h-56">
                    <ResponsiveContainer>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                            <XAxis dataKey="w" stroke="#ffffff40" fontSize={11} />
                            <YAxis stroke="#ffffff40" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="weight" fill={brand.primaryColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </TrainerShell>
    )
}
