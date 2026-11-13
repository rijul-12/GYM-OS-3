'use client'
import { LayoutDashboard, Users, Activity, BarChart3, Palette, UserCog, CreditCard, Settings, PlugZap, FileClock, Dumbbell, Database, Wallet, BadgeCheck } from 'lucide-react'
import { AppShell } from './app-shell'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/trainers', label: 'Trainers', icon: UserCog },
  { href: '/plans', label: 'Membership Plans', icon: BadgeCheck },
  { href: '/dashboard/payments', label: 'Payments', icon: Wallet },
  { href: '/occupancy', label: 'Live Traffic', icon: Activity },
  { href: '/attendance-logs', label: 'Attendance', icon: FileClock },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/import', label: 'Bring Your Data', icon: Database },
  { href: '/equipments', label: 'Equipment', icon: Dumbbell },
  { href: '/attendance-integrations', label: 'Integrations', icon: PlugZap },
  { href: '/branding', label: 'White Label', icon: Palette },
  { href: '/dashboard/subscription', label: 'BGM Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function DashShell(props) {
  return <AppShell nav={NAV} home="/dashboard" profileHref="/settings" showBanners {...props} />
}
