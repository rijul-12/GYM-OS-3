import PortalClient from './portal-client'
import { getMyProfile } from '@/actions/db/members'
import { getDashboardStats } from '@/actions/db/gyms'

export default async function PortalPage() {
  const [member, live] = await Promise.all([getMyProfile(), getDashboardStats()])
  return <PortalClient member={member} live={live} />
}
