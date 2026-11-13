'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useAuth } from '@/lib/auth'

// Quick navigation (Ctrl/Cmd + K). Every entry points at a route that exists for that role.
const LINKS = {
  owner: [
    ['Dashboard', '/dashboard'], ['Members', '/members'], ['Trainers', '/trainers'], ['Membership plans', '/plans'],
    ['Payments', '/dashboard/payments'], ['Live traffic', '/occupancy'], ['Attendance', '/attendance-logs'], ['Analytics', '/analytics'],
    ['Bring your data', '/dashboard/import'], ['White label', '/branding'], ['BGM subscription', '/dashboard/subscription'], ['Settings', '/settings'], ['Help', '/help'],
  ],
  trainer: [['Dashboard', '/trainer'], ['Assigned members', '/trainer/members'], ['Workout schedules', '/trainer/plans'], ['Progress', '/trainer/progress'], ['Live gym', '/trainer/live'], ['Profile', '/trainer/profile']],
  member: [['Home', '/portal'], ['Workout schedule', '/portal/schedule'], ['Live gym', '/portal/live'], ['Attendance', '/portal/attendance'], ['Membership', '/portal/membership'], ['Payments & dues', '/portal/billing'], ['GymAI', '/portal/insights'], ['Profile', '/portal/profile']],
  super_admin: [['Dashboard', '/super-admin'], ['Gyms', '/super-admin/gyms'], ['Owners', '/super-admin/owners'], ['Subscriptions', '/super-admin/subscriptions'], ['Analytics', '/super-admin/analytics'], ['Audit logs', '/super-admin/audit'], ['Settings', '/super-admin/settings']],
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o) }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const links = user?.role ? LINKS[user.role] : null
  if (!links) return null

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Go to…" />
      <CommandList>
        <CommandEmpty>No matching page.</CommandEmpty>
        <CommandGroup heading="Pages">
          {links.map(([label, href]) => (
            <CommandItem key={href} onSelect={() => { setOpen(false); router.push(href) }}>{label}</CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
