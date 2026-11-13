import LiveClient from './live-client'
import { getDashboardStats } from '@/actions/db/gyms'

export const metadata = { title: 'Live Gym' }

export default async function LivePage() {
  return <LiveClient live={await getDashboardStats()} />
}
