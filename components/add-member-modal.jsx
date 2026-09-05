'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Users, DollarSign, Dumbbell, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBrand } from './brand-provider'
import { toast } from 'sonner'
import { createMember } from '@/actions/db/members'
import { getPlans } from '@/actions/db/plans'
import { Switch } from '@/components/ui/switch'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function AddMemberModal({ open, onOpenChange, onSuccess }) {
    const { brand } = useBrand()
    const [step, setStep] = useState(1) // 1: Personal, 2: Fitness & Schedule, 3: Finance, 4: Review
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)
    const [availablePlans, setAvailablePlans] = useState([])

    const defaultSchedule = { Monday: '', Tuesday: '', Wednesday: '', Thursday: '', Friday: '', Saturday: '', Sunday: '' }

    const [form, setForm] = useState({
        name: '', email: '', phone: '', dob: '', gender: 'Male', address: '', emergencyContact: '',
        goal: '', preferredTime: '', trainer_name: 'Unassigned',
        noFixedSchedule: false, schedule: defaultSchedule,
        plan: 'Base Member', startDate: '', expiryDate: '',
        paymentFee: '', amountPaid: '', outstandingAmount: 0, paymentStatus: 'Unpaid', paymentMethod: 'Cash', membershipStatus: 'Active'
    })

    useEffect(() => {
        if (open) {
            getPlans().then(setAvailablePlans).catch(e => { })
            setStep(1)
            setErrorMsg(null)
            setForm({
                name: '', email: '', phone: '', dob: '', gender: 'Male', address: '', emergencyContact: '',
                goal: '', preferredTime: '', trainer_name: 'Unassigned',
                noFixedSchedule: false, schedule: defaultSchedule,
                plan: 'Base Member', startDate: new Date().toISOString().split('T')[0], expiryDate: '',
                paymentFee: '', amountPaid: '', outstandingAmount: 0, paymentStatus: 'Unpaid', paymentMethod: 'Cash', membershipStatus: 'Active'
            })
        }
    }, [open])

    useEffect(() => {
        const fee = Number(form.paymentFee) || 0
        const paid = Number(form.amountPaid) || 0
        const out = Math.max(0, fee - paid)
        let status = 'Unpaid'
        if (paid > 0 && paid < fee) status = 'Partially Paid'
        if (paid > 0 && paid >= fee) status = 'Paid'
        setForm(prev => ({ ...prev, outstandingAmount: out, paymentStatus: status }))
    }, [form.paymentFee, form.amountPaid])

    const validateStep = () => {
        if (step === 1) return form.name && form.email && form.phone
        if (step === 2) return true
        if (step === 3) return form.plan && form.startDate
        return true
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setErrorMsg(null)
        try {
            const res = await createMember(form)
            if (res.error) {
                setErrorMsg(res.error)
            } else {
                toast.success(`Member ${form.name} successfully created!`, { id: 'create-member' })
                onSuccess?.()
                onOpenChange(false)
            }
        } catch (e) {
            setErrorMsg(e.message || "Failed to create member.")
        }
        setSubmitting(false)
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
                    <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-background border border-foreground/10 rounded-2xl p-0 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

                        {/* Sidebar Progress */}
                        <div className="w-full md:w-56 bg-foreground/[0.02] border-b md:border-b-0 md:border-r border-foreground/5 p-6 flex flex-col gap-6 shrink-0">
                            {[
                                { s: 1, label: 'Identity', icon: Users },
                                { s: 2, label: 'Fitness & Schedule', icon: Dumbbell },
                                { s: 3, label: 'Membership Plan', icon: DollarSign },
                                { s: 4, label: 'Owner Approval', icon: CheckCircle2 }
                            ].map(item => (
                                <div key={item.s} className={`flex items-center gap-3 transition-colors ${step === item.s ? 'text-foreground' : step > item.s ? 'text-foreground/70' : 'text-foreground/30'}`}>
                                    <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: step >= item.s ? brand.primaryColor : 'transparent', background: step >= item.s ? `${brand.primaryColor}20` : 'rgba(255,255,255,0.05)' }}>
                                        <item.icon className="h-4 w-4" style={{ color: step >= item.s ? brand.primaryColor : undefined }} />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 bg-black overflow-y-auto">
                            <div className="p-6 pb-2 border-b border-foreground/5 flex items-center justify-between sticky top-0 bg-black z-10">
                                <h2 className="text-xl font-display font-bold">New Registration</h2>
                                <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-foreground/[0.04] rounded transition-colors"><X className="h-5 w-5 text-foreground/50" /></button>
                            </div>

                            <div className="p-6 flex-1 min-h-[450px]">
                                {errorMsg && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-100">{errorMsg}</div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 md:col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Full Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="John Doe" /></div>
                                            <div className="col-span-2 md:col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Email Address *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="john@example.com" /></div>
                                            <div className="col-span-2 md:col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Mobile Number *</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="9876543210" /></div>
                                            <div className="col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Date of Birth</label><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm appearance-none custom-date" /></div>

                                            <div className="col-span-2 md:col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Gender</label>
                                                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm appearance-none">
                                                    <option value="Male" className="text-black">Male</option><option value="Female" className="text-black">Female</option><option value="Other" className="text-black">Other</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Emergency Contact</label><input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="Name & Number" /></div>
                                            <div className="col-span-2"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Home Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="123 Street Name, City" /></div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 border-b border-foreground/10 pb-4">
                                            <div className="col-span-2"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Primary Fitness Goal</label><input value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="Hypertrophy, Weight Loss, etc." /></div>
                                            <div className="col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Preferred Time</label><input type="time" value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm custom-time" /></div>
                                            <div className="col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Assigned Trainer</label><input value={form.trainer_name} onChange={e => setForm({ ...form, trainer_name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" placeholder="Trainer Name or 'Unassigned'" /></div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold">Weekly Workout Schedule (Multiple Muscles)</label>
                                                <div className="flex items-center gap-2 text-sm text-foreground/60"><Switch checked={form.noFixedSchedule} onCheckedChange={(val) => setForm({ ...form, noFixedSchedule: val })} /> No fixed schedule</div>
                                            </div>
                                            {!form.noFixedSchedule ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                                    {DAYS.map(day => (
                                                        <div key={day} className="flex flex-col">
                                                            <div className="text-[10px] text-foreground/50 mb-0.5 ml-1">{day}</div>
                                                            <input value={form.schedule[day]} onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, [day]: e.target.value } })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-md p-2 outline-none font-medium text-xs" placeholder="Chest, Triceps" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-foreground/[0.02] border border-foreground/5 rounded-lg p-4 text-sm text-foreground/50 text-center">
                                                    Member has flexible days. They will select their workout during QR Check-in.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Membership Plan *</label>
                                                <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm text-foreground appearance-none">
                                                    {availablePlans.length === 0 ? <option className="text-black" value="Base Member">Base Member</option> : null}
                                                    {availablePlans.map(p => <option key={p.id} value={p.name} className="text-black">{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Start Date *</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" /></div>
                                            <div className="col-span-1"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Expiry Date</label><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm" /></div>
                                            <div className="col-span-2"><label className="text-xs text-foreground/50 uppercase tracking-widest font-semibold block mb-1.5">Membership Status</label>
                                                <select value={form.membershipStatus} onChange={e => setForm({ ...form, membershipStatus: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2.5 outline-none font-medium text-sm appearance-none">
                                                    <option value="Active" className="text-black">Active</option>
                                                    <option value="Pending" className="text-black">Pending</option>
                                                </select>
                                            </div>

                                            <div className="col-span-2 border-t border-foreground/10 pt-4 mt-2">
                                                <div className="text-xs text-foreground/50 uppercase tracking-widest font-semibold mb-3">Revenue Collection</div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div><label className="text-[10px] text-foreground/40 block mb-1">Total Fee ₹</label><input type="number" value={form.paymentFee} onChange={e => setForm({ ...form, paymentFee: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 outline-none text-sm" placeholder="0" /></div>
                                                    <div><label className="text-[10px] text-foreground/40 block mb-1">Amount Paid ₹</label><input type="number" value={form.amountPaid} onChange={e => setForm({ ...form, amountPaid: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 outline-none text-sm" placeholder="0" /></div>
                                                    <div><label className="text-[10px] text-foreground/40 block mb-1">Status</label>
                                                        <select disabled value={form.paymentStatus} className="w-full bg-foreground/[0.01] text-foreground/50 border border-foreground/5 rounded-lg p-2 outline-none text-sm appearance-none cursor-not-allowed">
                                                            <option value={form.paymentStatus} className="text-black">{form.paymentStatus}</option>
                                                        </select>
                                                    </div>
                                                    <div><label className="text-[10px] text-foreground/40 block mb-1">Method</label>
                                                        <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-2 outline-none text-sm appearance-none">
                                                            <option value="Cash" className="text-black">Cash</option><option value="Card" className="text-black">Card</option><option value="Razorpay" className="text-black">Online / UPI</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-4 mt-1"><div className="text-[10px] text-foreground/40">Outstanding Amount: <strong className="text-foreground">₹{form.outstandingAmount}</strong></div></div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                        <div className="bg-foreground/[0.02] border border-foreground/5 rounded-xl p-5 mb-4">
                                            <div className="font-display text-xl font-bold mb-1">{form.name}</div>
                                            <div className="text-sm text-foreground/50">{form.email} • {form.phone}</div>

                                            <div className="grid grid-cols-2 gap-4 mt-6">
                                                <div>
                                                    <div className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Membership</div>
                                                    <div className="text-sm mt-1">{form.plan} • {form.membershipStatus}</div>
                                                    <div className="text-xs text-foreground/50 mt-1">{form.startDate} to {form.expiryDate || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Trainer</div>
                                                    <div className="text-sm mt-1">{form.trainer_name}</div>
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Schedule</div>
                                                    {form.noFixedSchedule ? (
                                                        <div className="text-sm mt-1">No fixed schedule (Flexible)</div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1 text-xs">
                                                            {DAYS.filter(d => form.schedule[d]).map(d => (
                                                                <div key={d} className="bg-foreground/[0.05] p-1.5 rounded">{d.substring(0, 3)}: {form.schedule[d]}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-2 border-t border-foreground/10 pt-3">
                                                    <div className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Financials</div>
                                                    <div className="text-sm mt-1 flex gap-4 text-foreground/80">
                                                        <span>Fee: ₹{form.paymentFee}</span>
                                                        <span>Paid: ₹{form.amountPaid}</span>
                                                        <span className="text-orange-400">Due: ₹{form.outstandingAmount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-foreground/50 text-center">
                                            Clicking "Approve & Add Member" will lock this identity in the database, provision portals, initialize revenue tracking, and generate credentials.
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="p-5 border-t border-foreground/5 flex justify-between bg-black sticky bottom-0">
                                {step > 1 ? (
                                    <Button variant="outline" className="border-foreground/10 text-foreground" onClick={() => { setErrorMsg(null); setStep(step - 1); }}>Back</Button>
                                ) : (
                                    <Button variant="outline" className="border-transparent text-foreground/50" onClick={() => onOpenChange(false)}>Cancel</Button>
                                )}

                                {step < 4 ? (
                                    <Button style={{ background: brand.primaryColor }} className="text-white border-0 font-semibold" disabled={!validateStep()} onClick={() => setStep(step + 1)}>Continue</Button>
                                ) : (
                                    <Button disabled={submitting} style={{ background: brand.primaryColor }} className="text-white border-0 font-bold" onClick={handleSubmit}>
                                        {submitting ? 'Provisioning Member...' : 'Approve & Add Member'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
