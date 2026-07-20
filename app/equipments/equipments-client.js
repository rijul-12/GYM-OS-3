'use client'
import { useState } from 'react'
import { Save, Loader2, Dumbbell, ArchiveX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useBrand } from '@/components/brand-provider'

export default function EquipmentsClient({ initialData, gymCode }) {
    const { brand } = useBrand()
    const [equipment, setEquipment] = useState(Object.keys(initialData).length > 0 ? initialData : {
        Cardio: [{ id: 'treadmill', name: 'Treadmill', qty: 0 }],
        Legs: [{ id: 'leg_press', name: 'Leg Press', qty: 0 }],
        Chest: [{ id: 'bench_press', name: 'Bench Press', qty: 0 }],
        Back: [{ id: 'lat_pull', name: 'Lat Pulldown', qty: 0 }],
        Weights: [{ id: 'dumbbells', name: 'Dumbbell Set', qty: 0 }]
    })
    const [loading, setLoading] = useState(false)

    const updateEquipment = (category, index, increment) => {
        setEquipment(prev => {
            const copy = { ...prev }
            const currentItem = copy[category][index]
            currentItem.qty = Math.max(0, currentItem.qty + increment)
            return copy
        })
    }

    const saveInventory = async () => {
        setLoading(true)
        try {
            await fetch('/api/equipments/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipment, gymCode })
            })
            toast.success("Inventory fully synchronized.")
        } catch (err) {
            toast.error("Failed to commit inventory mapping.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <p className="text-foreground/50 text-sm">Update specific cart quantities mapping to actual physical counts at your local facility.</p>
                <Button onClick={saveInventory} disabled={loading} style={{ background: brand.primaryColor }} className="text-foreground border-0 shadow-lg shadow-red-500/20 rounded-full h-10 px-6">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Synchronization
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {Object.keys(equipment).map(cat => (
                    <div key={cat} className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden">
                        <div className="px-5 py-4 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.01]">
                            <Dumbbell className="h-4 w-4 text-foreground/40" />
                            <span className="font-display font-medium">{cat}</span>
                        </div>
                        <div className="p-2 space-y-1">
                            {equipment[cat].map((item, i) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-foreground/[0.04] transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-foreground/20 group-hover:text-foreground/50 transition">
                                            <ArchiveX className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-card rounded-lg p-1 border border-foreground/5">
                                        <button onClick={() => updateEquipment(cat, i, -1)} className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/50 hover:bg-white/10 hover:text-foreground transition">-</button>
                                        <div className="w-6 text-center text-sm font-mono tracking-wider">{item.qty}</div>
                                        <button onClick={() => updateEquipment(cat, i, 1)} className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/50 hover:bg-white/10 hover:text-foreground transition">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
