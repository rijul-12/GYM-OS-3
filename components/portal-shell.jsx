'use client'
import { Home, Radio, Sparkles, Calendar, User, CreditCard, BadgeCheck, CalendarDays } from 'lucide-react'
import { AppShell } from './app-shell'

const NAV = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/schedule', label: 'Workout Schedule', icon: CalendarDays },
  { href: '/portal/live', label: 'Live Gym', icon: Radio },
  { href: '/portal/attendance', label: 'Attendance', icon: Calendar },
  { href: '/portal/membership', label: 'Membership', icon: BadgeCheck },
  { href: '/portal/billing', label: 'Payments & Dues', icon: CreditCard },
  { href: '/portal/insights', label: 'GymAI', icon: Sparkles },
  { href: '/portal/profile', label: 'Profile', icon: User },
]

const TABS = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/live', label: 'Live', icon: Radio },
  { href: '/portal/schedule', label: 'Plan', icon: CalendarDays },
  { href: '/portal/billing', label: 'Pay', icon: CreditCard },
  { href: '/portal/profile', label: 'Me', icon: User },
]

export function PortalShell({ hideTitleOnDesktop, ...props }) {
  return <AppShell nav={NAV} tabs={TABS} home="/portal" profileHref="/portal/profile" {...props} title={props.title || 'Home'} />
}
