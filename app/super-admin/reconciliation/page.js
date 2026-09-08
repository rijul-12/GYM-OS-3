'use client'
import { useState, useEffect } from 'react'
import { FileSearch, Trash2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SuperadminShell } from '@/components/superadmin-shell'
import { fetchOrphans, executeOrphanCleanup } from './reconciliation-client'

export default function ReconciliationDashboard() {
    const [loading, setLoading] = useState(false)
    const [orphans, setOrphans] = useState({ owners: [], members: [], trainers: [] })

    const handleScan = async () => {
        setLoading(true)
        try {
            const res = await fetchOrphans()
            setOrphans(res)
        } finally {
            setLoading(false)
        }
    }

    const handleCleanup = async (uid) => {
        if (!confirm("Execute cascade deletion for this orphaned identity?")) return;
        setLoading(true)
        await executeOrphanCleanup(uid)
        await handleScan()
    }

    return (
        <SuperadminShell>
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">Data Reconciliation</h1>
                        <p className="text-foreground/50">Detect and wipe application records detached from active Firebase Auth profiles.</p>
                    </div>
                    <Button onClick={handleScan} disabled={loading} className="gap-2 bg-foreground text-background">
                        <FileSearch className="h-4 w-4" /> {loading ? 'Scanning...' : 'Scan For Orphans'}
                    </Button>
                </div>

                <div className="space-y-6">
                    <OrphanTable title="Orphaned Owners" data={orphans.owners} onClean={handleCleanup} />
                    <OrphanTable title="Orphaned Members" data={orphans.members} onClean={handleCleanup} />
                    <OrphanTable title="Orphaned Trainers" data={orphans.trainers} onClean={handleCleanup} />
                </div>
            </div>
        </SuperadminShell>
    )
}

function OrphanTable({ title, data, onClean }) {
    if (!data || data.length === 0) return null;
    return (
        <div className="rounded-xl border border-white/5 bg-foreground/[0.02] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">{title} ({data.length})</h3>
            <div className="divide-y divide-white/5">
                {data.map(d => (
                    <div key={d.uid} className="py-3 flex items-center justify-between">
                        <div>
                            <div className="font-medium text-white">{d.email || d.uid}</div>
                            <div className="text-xs text-white/40">Found inside collections, missing from Auth.</div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => onClean(d.uid)} className="gap-1.5"><Trash2 className="h-3 w-3" /> Force Clean</Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
