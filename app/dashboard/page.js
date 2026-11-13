import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'
import { getDashboardStats } from '@/actions/db/gyms'
import { requireRole, getGymContext } from '@/lib/server/session'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await requireRole('owner')
  const { settings } = await getGymContext(session.gymId)
  if (settings.onboarded === false) redirect('/onboarding')
  const stats = await getDashboardStats()
  return <DashboardClient stats={stats} />
}
