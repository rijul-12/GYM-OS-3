'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Award, Clock, Calendar, Star, Mail, Phone, Edit3, Users, GraduationCap } from 'lucide-react'
import { TrainerShell } from '@/components/trainer-shell'
import { useBrand } from '@/components/brand-provider'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'
import { updateTrainerProfile } from '@/actions/db/trainers'
import { X, Save, UploadCloud } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { uploadProfilePhoto } from '@/actions/db/storage'
import { compressProfileImage } from '@/lib/image-utils'

export default function TrainerClient({ trainer }) {
  const { brand } = useBrand()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(trainer || {})
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateTrainerProfile(trainer.id, {
        name: form.name,
        specialty: form.specialty,
        bio: form.bio,
        availability: form.availability,
        workingHours: form.workingHours,
        hourlyRate: Number(form.hourlyRate)
      })
      toast.success("Profile updated successfully")
      setIsEditing(false)
    })
  }

  const handlePhotoUpdate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be less than 5MB');

    startTransition(async () => {
      try {
        const webpBase64 = await compressProfileImage(file);
        const res = await uploadProfilePhoto(trainer.id, webpBase64);
        if (res?.success) toast.success('Photo updated!');
        else throw new Error(res?.error || 'Upload failed');
      } catch (err) {
        toast.error('Failed to update photo.');
      }
    });
  }

  if (!trainer) {
    return (
      <TrainerShell title="Profile" subtitle="Your public trainer card">

        <div className="mt-8 text-center bg-foreground/[0.02] p-10 rounded-2xl border border-foreground/5 h-[400px] flex flex-col items-center justify-center">
          <div className="text-foreground/40 text-lg mb-2">No data yet</div>
          <div className="text-foreground/20 text-sm">Your trainer profile has not been configured by the Gym Owner.</div>
        </div>
      </TrainerShell>
    )
  }

  const t = trainer;

  return (
    <TrainerShell title="Profile" subtitle="Your public trainer card" actions={<Button onClick={() => setIsEditing(true)} style={{ background: brand.primaryColor }} className="h-10 text-foreground border-0 hover:opacity-90"><Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile</Button>}>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden border border-foreground/10" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}18, transparent 60%)` }}>
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: brand.primaryColor }} />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
          <Image src={t.photo || 'https://i.pravatar.cc/150?u=a'} className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/50 font-semibold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t.availability}</span>
            </div>
            <div className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">{t.name}</div>
            <div className="text-sm text-foreground/60 mt-1">{t.specialty}</div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-foreground/70">
              <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {t.rating} rating</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t.members || 0} assigned clients</span>
              <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Performance {t.performance}%</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t.experience} exp.</span>
            </div>
          </div>
          <div className="rounded-2xl border border-foreground/5 bg-black/40 p-4 text-center min-w-[140px]">
            <div className="text-[10px] uppercase tracking-widest text-foreground/50">Hourly rate</div>
            <div className="font-display text-2xl font-bold" style={{ color: brand.primaryColor }}>${t.hourlyRate}</div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        {/* Bio */}
        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="text-[10px] uppercase tracking-widest text-foreground/50">About</div>
          <div className="mt-3 text-sm text-foreground/80 leading-relaxed">{t.bio}</div>

          <div className="mt-5 text-[10px] uppercase tracking-widest text-foreground/50">Specialization</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(t.specialty || 'General Fitness').split(' & ').map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: `${brand.primaryColor}18`, color: brand.primaryColor }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Working hours</div></div>
          <div className="text-sm text-foreground/80 mt-2">{t.workingHours}</div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
              const on = i < 5
              return (
                <div key={d} className="rounded-lg text-center p-2" style={{ background: on ? `${brand.primaryColor}18` : 'rgba(255,255,255,0.03)', border: on ? `1px solid ${brand.primaryColor}40` : '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-[10px]" style={{ color: on ? brand.primaryColor : 'rgba(255,255,255,0.4)' }}>{d}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 text-[10px] uppercase tracking-widest text-foreground/50">Contact</div>
          <div className="mt-2 space-y-2 text-sm text-foreground/80">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-foreground/40" /> trainer@bgm.app</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-foreground/40" /> +1 (415) 555-0130</div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 mt-5">
        <div className="flex items-center gap-2 mb-1"><GraduationCap className="h-4 w-4" style={{ color: brand.primaryColor }} /><div className="text-sm font-medium">Certifications</div></div>
        <div className="text-xs text-foreground/40 mb-4">Verified credentials</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
          {(t.certifications || []).map((c) => (
            <div key={c} className="rounded-xl border border-foreground/5 bg-black/30 p-4 text-center">
              <Award className="h-5 w-5 mx-auto" style={{ color: brand.primaryColor }} />
              <div className="text-xs mt-2 font-medium">{c}</div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="fixed inset-0 z-50 bg-black/70 backdrop-blur" />
            <motion.div initial={{ x: 500, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 500, opacity: 0 }} transition={{ type: 'spring', damping: 30 }} className="fixed z-50 top-0 right-0 h-full w-full max-w-xl bg-card border-l border-foreground/10 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-xl font-bold font-display">Edit Profile</div>
                  <button onClick={() => setIsEditing(false)} className="text-foreground/50 hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Display Name</label>
                    <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Profile Photo Upload</label>
                    <div className="flex items-center gap-4">
                      <Image src={t.photo || 'https://i.pravatar.cc/150?u=a'} className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" alt="" width={60} height={60} />
                      <label className="cursor-pointer text-xs flex items-center gap-1.5 bg-foreground/[0.05] hover:bg-foreground/[0.1] px-3 py-2 rounded-lg border border-foreground/10 transition">
                        <UploadCloud className="h-3.5 w-3.5" /> Upload File
                        <input type="file" onChange={handlePhotoUpdate} accept="image/*" className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-1.5">Availability Status</label>
                      <select value={form.availability || 'Full Time'} onChange={e => setForm({ ...form, availability: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm outline-none">
                        <option>Full Time</option>
                        <option>Part Time</option>
                        <option>Not Accepting New</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-1.5">Hourly Rate ($)</label>
                      <input type="number" value={form.hourlyRate || ''} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Specialization</label>
                    <input value={form.specialty || ''} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Strength & Rehab" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Detailed Biography</label>
                    <textarea value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} rows={4} className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-lg p-3 text-sm focus:border-foreground/30 outline-none resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/50 uppercase tracking-widest block mb-2">Working Hours</label>
                    <input value={form.workingHours || ''} onChange={e => setForm({ ...form, workingHours: e.target.value })} placeholder="e.g. 5:00 AM - 1:00 PM" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-foreground/5">
                  <Button disabled={isPending} onClick={() => setIsEditing(false)} variant="ghost">Cancel</Button>
                  <Button disabled={isPending} onClick={handleSave} style={{ background: brand.primaryColor }} className="text-foreground border-0"><Save className="h-4 w-4 mr-1.5" /> Save Changes</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TrainerShell>
  )
}

