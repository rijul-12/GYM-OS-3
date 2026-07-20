'use client'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useBrand } from '@/components/brand-provider'

export function StatCard({ icon: Icon, label, value, sub, delta, positive = true, tone }) {
    const { brand } = useBrand()
    const c = tone || brand.primaryColor
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-foreground/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 card-hover">
            <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${c}20`, border: `1px solid ${c}40` }}>
                    <Icon className="h-4 w-4" style={{ color: c }} />
                </div>
                {delta && (
                    <div className={`text-xs flex items-center gap-0.5 font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {delta}
                    </div>
                )}
            </div>
            <div className="mt-4 text-[10px] uppercase tracking-widest text-foreground/50">{label}</div>
            <div className="font-display text-3xl font-bold tracking-tight mt-1">{value}</div>
            {sub && <div className="text-xs text-foreground/40 mt-0.5">{sub}</div>}
        </motion.div>
    )
}
