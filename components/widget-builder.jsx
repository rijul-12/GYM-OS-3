'use client'
import { useState, useTransition } from 'react'
import { motion, Reorder } from 'framer-motion'
import { Plus, GripVertical, Trash2, Edit2, MapPin, Eye, EyeOff } from 'lucide-react'
import { useBrand } from '@/components/brand-provider'
import { saveGymWidgets } from '@/actions/db/gyms'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

const PRESETS = [
    { name: 'Chest Zone', muscleGroup: 'Chest', emoji: '💪', color: '#ef4444' },
    { name: 'Back Zone', muscleGroup: 'Back', emoji: '🏋️', color: '#f97316' },
    { name: 'Leg Zone', muscleGroup: 'Legs', emoji: '🦵', color: '#22c55e' },
    { name: 'Shoulder Zone', muscleGroup: 'Shoulders', emoji: '🎯', color: '#eab308' },
    { name: 'Arms Zone', muscleGroup: 'Arms', emoji: '💥', color: '#84cc16' },
    { name: 'Core Zone', muscleGroup: 'Core', emoji: '🏃', color: '#3b82f6' },
    { name: 'Cardio Zone', muscleGroup: 'Cardio', emoji: '🚴', color: '#06b6d4' },
    { name: 'Functional Training', muscleGroup: 'Multi', emoji: '🤸', color: '#8b5cf6' },
    { name: 'CrossFit', muscleGroup: 'Multi', emoji: '🔥', color: '#ec4899' },
    { name: 'Yoga Studio', muscleGroup: 'Yoga', emoji: '🧘', color: '#10b981' },
    { name: 'Swimming Pool', muscleGroup: 'Swimming', emoji: '🏊', color: '#3b82f6' },
];

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Yoga', 'Swimming', 'Multi', 'Custom'];

export function WidgetBuilder() {
    const { brand, setBrand } = useBrand()
    const [isPending, startTransition] = useTransition()

    // Initialize default widgets if they don't exist
    const widgets = brand.widgets && brand.widgets.length > 0 ? brand.widgets : PRESETS.slice(0, 6).map(p => ({
        id: uuidv4(),
        ...p,
        capacity: 10,
        isActive: true,
        category: 'Preset'
    }));

    const [items, setItems] = useState(widgets)
    const [editingId, setEditingId] = useState(null)
    const [editorData, setEditorData] = useState(null)

    const handleSave = async (newItems) => {
        setItems(newItems);
        setBrand({ widgets: newItems });

        startTransition(async () => {
            const ok = await saveGymWidgets(null, newItems);
            if (ok) toast.success("Facilities saved and synced with Live Traffic!");
            else toast.error("Failed to commit to database. Try again.");
        })
    }

    const toggleActive = (id, active) => {
        const next = items.map(t => t.id === id ? { ...t, isActive: active } : t);
        handleSave(next);
    }

    const removeWidget = (id) => {
        const next = items.filter(t => t.id !== id);
        handleSave(next);
    }

    const openEditor = (item = null) => {
        if (!item) {
            setEditorData({ id: uuidv4(), name: '', capacity: 10, muscleGroup: 'Multi', emoji: '📍', color: brand.primaryColor || '#ef4444', isActive: true, category: 'Custom' });
        } else {
            setEditorData({ ...item });
        }
    }

    const applyPreset = (preset) => {
        setEditorData({ ...editorData, ...preset, category: 'Preset' });
    }

    const saveEditor = () => {
        if (!editorData.name) return toast.error("Name is required");

        let next;
        if (items.some(i => i.id === editorData.id)) {
            next = items.map(i => i.id === editorData.id ? editorData : i);
        } else {
            next = [...items, editorData];
        }

        handleSave(next);
        setEditorData(null);
    }

    if (editorData) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">{items.some(i => i.id === editorData.id) ? 'Edit Facility' : 'Add New Facility'}</h3>
                        <div className="text-xs text-foreground/50">Configure how this widget handles Live Traffic</div>
                    </div>
                    <Button variant="outline" onClick={() => setEditorData(null)}>Cancel</Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="col-span-2 md:col-span-1 border border-foreground/5 bg-foreground/[0.02] p-4 rounded-xl">
                        <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-1.5 block">Facility Name</Label>
                        <Input value={editorData.name} onChange={e => setEditorData({ ...editorData, name: e.target.value })} placeholder="e.g. Pilates Studio" className="bg-white/5 border-white/10" />

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div>
                                <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-1.5 block">Emoji Icon</Label>
                                <Input value={editorData.emoji} onChange={e => setEditorData({ ...editorData, emoji: e.target.value })} className="bg-white/5 border-white/10 text-center text-xl" />
                            </div>
                            <div>
                                <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-1.5 block">Color Hue</Label>
                                <Input type="color" value={editorData.color} onChange={e => setEditorData({ ...editorData, color: e.target.value })} className="p-1 h-10 w-full rounded-md bg-white/5 border-white/10" />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1 border border-foreground/5 bg-foreground/[0.02] p-4 rounded-xl">
                        <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-1.5 block">Live Traffic Capacity</Label>
                        <Input type="number" min="1" value={editorData.capacity} onChange={e => setEditorData({ ...editorData, capacity: parseInt(e.target.value) || 1 })} className="bg-white/5 border-white/10" />

                        <div className="mt-4">
                            <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-1.5 block">Muscle Link (AI AIgos)</Label>
                            <select value={editorData.muscleGroup} onChange={e => setEditorData({ ...editorData, muscleGroup: e.target.value })} className="h-9 w-full rounded-md bg-foreground/[0.03] border border-foreground/10 px-3 text-sm">
                                {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {!items.some(i => i.id === editorData.id) && (
                    <div className="mb-6">
                        <Label className="text-xs text-foreground/50 uppercase tracking-widest mb-2 block">Quick Presets</Label>
                        <div className="flex flex-wrap gap-2">
                            {PRESETS.map(p => (
                                <button key={p.name} onClick={() => applyPreset(p)} className="text-xs font-medium bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-full transition flex items-center gap-1.5">
                                    <span>{p.emoji}</span> {p.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Button onClick={saveEditor} disabled={isPending} style={{ background: brand.primaryColor }} className="w-full text-foreground">{isPending ? 'Saving...' : 'Save Facility Widget'}</Button>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-5 flex items-start justify-between">
                <div>
                    <div className="text-lg font-semibold">Facilities & Zones</div>
                    <div className="text-xs text-foreground/50">Manage the physical areas of your gym for Live Traffic</div>
                </div>
                <Button onClick={() => openEditor(null)} variant="outline" className="h-8 text-xs bg-foreground/[0.03] border-foreground/10"><Plus className="h-4 w-4 mr-1" /> Add Widget</Button>
            </div>

            <Reorder.Group axis="y" values={items} onReorder={handleSave} className="space-y-2">
                {items.map(item => (
                    <Reorder.Item key={item.id} value={item} className="flex items-center gap-3 p-3 rounded-xl border border-foreground/5 bg-foreground/[0.015] shadow-sm cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5 text-foreground/20" />
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: `${item.color}20` }}>
                            {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-2">
                                {item.name}
                                {!item.isActive && <span className="text-[9px] uppercase font-bold bg-foreground/10 px-1.5 py-0.5 rounded-full text-foreground/60">Hidden</span>}
                            </div>
                            <div className="text-xs text-foreground/50 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                Mapping: {item.muscleGroup} • Cap: {item.capacity}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={item.isActive} onCheckedChange={(v) => toggleActive(item.id, v)} />
                            <button onClick={() => openEditor(item)} className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/50 transition"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => removeWidget(item.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {
                items.length === 0 && (
                    <div className="text-center py-8 text-foreground/40 text-sm">
                        No facilities configured. Click "Add Widget" to set up your floor.
                    </div>
                )
            }
        </div >
    )
}
