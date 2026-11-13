import AnalyticsClient from './analytics-client'
import { getAnalyticsStats } from '@/actions/db/analytics'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const stats = await getAnalyticsStats()
  return <AnalyticsClient stats={stats} />
}
