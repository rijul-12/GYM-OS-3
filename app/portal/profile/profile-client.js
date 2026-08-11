'use client'
import Image from 'next/image'
import { useState, useRef, useTransition } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Calendar, Phone, Mail, AlertCircle, Edit3, ChevronRight, Award } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'

import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { uploadProfilePhoto, removeProfilePhoto } from '@/actions/db/storage'
import { updateMember } from '@/actions/db/members'
import { X, Save } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { getInitials, getAvatarColor } from '@/lib/avatar'

function App({ member, globalAttendance, stats }) {
  const fileInputRef = useRef(null);
  const [isPending, startTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    dob: member?.dob || '',
    height: member?.bodyMeasurements?.height || '',
    weight: member?.bodyMeasurements?.weight || '',
    bloodType: member?.bloodType || '',
    emergencyContact: member?.emergencyContact || '',
    workoutSplit: member?.workoutSplit || '',
    preferredTime: member?.preferredTime || ''
  });

  const handleSave = () => {
    startTransition(async () => {
      await updateMember(ME.id, {
        name: form.name,
        phone: form.phone,
        dob: form.dob,
        bloodType: form.bloodType,
        emergencyContact: form.emergencyContact,
        workoutSplit: form.workoutSplit,
        preferredTime: form.preferredTime,
        bodyMeasurements: {
          ...member?.bodyMeasurements,
          height: form.height,
          weight: form.weight
        }
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    });
  };

  // --- INJECTED PROPS ---
  const joinedDate = member?.created_at ? new Date(member.created_at) : null;
  const ME = {
    id: member?.id,
    name: member?.name || "Member",
    plan: member?.plan || "Basic",
    joined: joinedDate && !isNaN(joinedDate) ? joinedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Membership start date unavailable',
    email: member?.email || 'Not provided',
    phone: member?.phone || 'Not provided',
    emergency: member?.emergencyContact || 'Not provided',
    photo: member?.photo_url || null
  };
  const PERSONAL = {
    dob: member?.dob || "Not provided",
    height: member?.bodyMeasurements?.height ? `${member.bodyMeasurements.height} cm` : "Not provided",
    weight: member?.bodyMeasurements?.weight ? `${member.bodyMeasurements.weight} kg` : "Not provided",
    bloodType: member?.bloodType || "Not provided",
    goals: member?.goal || "General",
    trainer: member?.trainers?.name || "Unassigned"
  };
  const WORKOUT_HISTORY = member?.workout_logs ? member.workout_logs.map(w => ({ date: w.date_logged || new Date(), workout: w.workout_plan_name || 'Workout', duration: w.duration_minutes || parseInt(w.duration) || 45, calories: w.calories_burned || parseInt(w.calories) || 300, stage: 'Lifting' })) : [];
  const ATTENDANCE_CALENDAR = { year: new Date().getFullYear(), month: new Date().getMonth(), today: new Date().getDate(), days: {} };
  if (Array.isArray(member?.attendance)) {
    member.attendance.forEach(a => {
      const d = new Date(a.checkIn || a.check_in_time).getDate();
      ATTENDANCE_CALENDAR.days[d] = { visited: true, duration: 60, intensity: 1 };
    });
  }
  const MEMBER_INSIGHTS = stats?.insights || [];
  const SCHEDULE = [{ day: 'Today', workout: member?.workoutSplit || 'General Fitness', time: member?.preferredTime || 'Anytime' }];
  const NOTIFICATION_PREFS = [{ id: 'em', label: 'Email', on: true }, { id: 'pu', label: 'Push', on: true }];

  const { brand } = useBrand()
  const [prefs, setPrefs] = useState(NOTIFICATION_PREFS)
  const toggle = (id) => setPrefs(prefs.map(p => p.id === id ? { ...p, on: !p.on } : p))

  return (
    <PortalShell title="Profile">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: brand.primaryColor }}>
          <User className="h-3 w-3" /> Your profile
        </div>
        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-xs font-bold bg-foreground/[0.05] hover:bg-foreground/[0.1] px-3 py-1.5 rounded-lg border border-foreground/10 transition"><Edit3 className="h-3.5 w-3.5" /> Edit Profile</button>
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Profile</h1>

      {/* Identity card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 rounded-3xl overflow-hidden border border-foreground/10" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}18, transparent 60%)` }}>
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-5">
          <div className="relative group shrink-0">
            {ME.photo ? (
              <Image src={ME.photo} className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover ring-2 ring-white/10" alt="" width={120} height={120} />
            ) : (
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-display font-bold ring-2 ring-white/10" style={{ backgroundColor: getAvatarColor(ME.name), color: '#fff' }}>
                {getInitials(ME.name)}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition gap-1 backdrop-blur-sm">
              <button disabled={isPending} onClick={() => fileInputRef.current?.click()} className="text-[10px] uppercase font-bold text-white hover:text-white/70">{isPending ? 'Wait...' : 'Change'}</button>
              {ME.photo && <button disabled={isPending} onClick={() => {
                startTransition(async () => {
                  await removeProfilePhoto(ME.id);
                  toast.success('Photo removed');
                });
              }} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300">Remove</button>}
            </div>
            <input type="file" ref={fileInputRef} accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) return toast.error('File must be less than 2MB');
              const reader = new FileReader();
              reader.onloadend = () => {
                startTransition(async () => {
                  try {
                    await uploadProfilePhoto(ME.id, reader.result);
                    toast.success('Profile photo updated!');
                  } catch (err) {
                    toast.error('Failed to upload photo');
                  }
                });
              };
              reader.readAsDataURL(file);
            }} />
          </div>
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="font-display text-2xl md:text-3xl font-bold tracking-tight">{ME.name}</div>
            <div className="text-sm text-foreground/60 mt-0.5">{ME.plan} {ME.joined === 'Membership start date unavailable' ? `· ${ME.joined}` : `· Member since ${ME.joined}`}</div>
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${brand.primaryColor}20`, color: brand.primaryColor }}>{PERSONAL.goals}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-foreground/70">Coach: {PERSONAL.trainer}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Workout schedule */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Workout schedule</h2></div>
        <p className="text-xs text-foreground/50 mb-5">Your weekly plan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCHEDULE.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-foreground/5 bg-black/30 p-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-display font-bold text-xs" style={{ background: `${brand.primaryColor}15`, color: brand.primaryColor }}>{s.day}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.workout}</div>
                <div className="text-[10px] text-foreground/50">{s.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Personal details */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-5"><User className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Personal details</h2></div>
        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
          {[
            { l: 'Email', v: ME.email, icon: Mail },
            { l: 'Phone', v: ME.phone, icon: Phone },
            { l: 'Date of birth', v: PERSONAL.dob },
            { l: 'Height', v: PERSONAL.height },
            { l: 'Weight', v: PERSONAL.weight },
            { l: 'Blood type', v: PERSONAL.bloodType },
          ].map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              {d.icon && <d.icon className="h-4 w-4 text-foreground/40" />}
              <div className={d.icon ? '' : 'ml-7'}>
                <div className="text-[10px] uppercase text-foreground/40 tracking-widest">{d.l}</div>
                <div className="text-foreground">{d.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency contact */}
      <div className="mt-4 rounded-3xl border p-6" style={{ borderColor: 'rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-orange-400" />
          <h2 className="font-display font-semibold">Emergency contact</h2>
        </div>
        <div className="text-sm text-foreground/80">{ME.emergency}</div>
      </div>

      {/* Notification prefs */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1"><Bell className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Notifications</h2></div>
        <p className="text-xs text-foreground/50 mb-4">Choose what you get pinged about</p>
        <div className="divide-y divide-white/5">
          {prefs.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="flex-1 min-w-0 pr-4">
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-foreground/50 mt-0.5">{p.desc}</div>
              </div>
              <Switch checked={p.on} onCheckedChange={() => toggle(p.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="mt-4 rounded-3xl border border-foreground/5 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-4"><Award className="h-4 w-4" style={{ color: brand.primaryColor }} /><h2 className="font-display font-semibold">Recent achievements</h2></div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: '6-day streak', emoji: '🔥' },
            { name: 'Bench PR', emoji: '🏆' },
            { name: '100 visits', emoji: '💪' },
          ].map((a, i) => (
            <div key={i} className="rounded-2xl border border-foreground/5 bg-black/30 p-4 text-center">
              <div className="text-3xl">{a.emoji}</div>
              <div className="text-xs mt-2 text-foreground/80">{a.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-foreground/40">
        <div>Signed in as {ME.email}</div>
        <a href="/" className="mt-2 inline-block hover:text-foreground">Sign out</a>
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

                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4" style={{ color: brand.primaryColor }} /> Personal Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Full Name</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Phone</label>
                          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Date of Birth</label>
                          <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Height (cm)</label>
                          <input type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Weight (kg)</label>
                          <input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Blood Type</label>
                          <input value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })} placeholder="e.g. O+" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold mb-3 flex items-center gap-2 mt-2"><AlertCircle className="h-4 w-4 text-orange-400" /> Emergency Contact</h3>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Name & Details</label>
                      <input value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} placeholder="e.g. John Doe - Brother - 555-0123" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold mb-3 flex items-center gap-2 mt-2"><Calendar className="h-4 w-4" style={{ color: brand.primaryColor }} /> Workout Preferences</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Workout Split</label>
                        <input value={form.workoutSplit} onChange={e => setForm({ ...form, workoutSplit: e.target.value })} placeholder="e.g. Push/Pull/Legs" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-foreground/50 block mb-1">Preferred Time</label>
                        <input value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} placeholder="e.g. 6:00 AM" className="w-full bg-foreground/[0.03] border border-foreground/10 h-10 rounded-lg px-3 text-sm focus:border-foreground/30 outline-none" />
                      </div>
                    </div>
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
    </PortalShell >
  )
}

export default App
