import AnalyticsClient from './analytics-client'
import { getGyms, getSuperAdminAnalytics } from '@/actions/db/gyms'

export const metadata = { title: 'Platform Analytics' }

export default async function SuperAdminAnalyticsPage() {
  const [gyms, analytics] = await Promise.all([getGyms(), getSuperAdminAnalytics()])
  return <AnalyticsClient gyms={gyms} analytics={analytics} />
}
