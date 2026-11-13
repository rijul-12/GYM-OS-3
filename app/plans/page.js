import PlansClient from './plans-client'
import { getPlans } from '@/actions/db/plans'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Membership Plans' }

export default async function PlansPage() {
  await requireRole('owner')
  return <PlansClient initialPlans={await getPlans()} />
}
