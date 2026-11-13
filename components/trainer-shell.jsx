'use client'
import { LayoutDashboard, Users, ClipboardList, Radio, TrendingUp, UserCog } from 'lucide-react'
import { AppShell } from './app-shell'

const NAV = [
  { href: '/trainer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trainer/members', label: 'Assigned Members', icon: Users },
  { href: '/trainer/plans', label: 'Workout Schedules', icon: ClipboardList },
  { href: '/trainer/progress', label: 'Progress', icon: TrendingUp },
  { href: '/trainer/live', label: 'Live Gym', icon: Radio },
  { href: '/trainer/profile', label: 'Profile', icon: UserCog },
]

const TABS = [
  { href: '/trainer', label: 'Home', icon: LayoutDashboard },
  { href: '/trainer/members', label: 'Members', icon: Users },
  { href: '/trainer/plans', label: 'Schedules', icon: ClipboardList },
  { href: '/trainer/live', label: 'Live', icon: Radio },
  { href: '/trainer/profile', label: 'Me', icon: UserCog },
]

export function TrainerShell(props) {
  return <AppShell nav={NAV} tabs={TABS} home="/trainer" profileHref="/trainer/profile" showBanners {...props} />
}
