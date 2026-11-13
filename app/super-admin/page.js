import SuperAdminClient from './superadmin-client'
import { getGyms, getSuperAdminAnalytics } from '@/actions/db/gyms'

export default async function SuperAdminPage() {
  const [gyms, analytics] = await Promise.all([getGyms(), getSuperAdminAnalytics()])
  return <SuperAdminClient gyms={gyms} analytics={analytics} />
}
