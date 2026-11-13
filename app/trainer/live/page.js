import LiveClient from './live-client'
import { getDashboardStats } from '@/actions/db/gyms'
import { getAssignedMembers } from '@/actions/db/trainer_operations'

export const metadata = { title: 'Live Gym' }

export default async function TrainerLivePage() {
  const [live, members] = await Promise.all([getDashboardStats(), getAssignedMembers()])
  return <LiveClient live={live} members={members} />
}
