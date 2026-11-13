import OccupancyClient from './occupancy-client'
import { getOccupancyStats } from '@/actions/db/occupancy'

export const metadata = { title: 'Live Traffic' }

export default async function OccupancyPage() {
  const stats = await getOccupancyStats()
  return <OccupancyClient stats={stats} />
}
