'use client'
import { LayoutDashboard, Building2, Users, CreditCard, BarChart3, Activity, LifeBuoy, ScrollText, Settings, Bell, Eraser } from 'lucide-react'
import { AppShell } from './app-shell'

const NAV = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/gyms', label: 'Gyms', icon: Building2 },
  { href: '/super-admin/owners', label: 'Owners', icon: Users },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/super-admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/super-admin/support', label: 'Feedback', icon: LifeBuoy },
  { href: '/super-admin/audit', label: 'Audit Logs', icon: ScrollText },
  { href: '/super-admin/health', label: 'System Health', icon: Activity },
  { href: '/super-admin/reconciliation', label: 'Data Cleaning', icon: Eraser },
  { href: '/super-admin/settings', label: 'Settings', icon: Settings },
]

export function SuperAdminShell(props) {
  return <AppShell nav={NAV} home="/super-admin" profileHref="/super-admin/settings" platformBrand {...props} title={props.title || 'Super Admin'} />
}
