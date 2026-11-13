import MembersClient from './members-client'
import { getMembers } from '@/actions/db/members'
import { getPlans } from '@/actions/db/plans'
import { getTrainers } from '@/actions/db/trainers'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Members' }

export default async function MembersPage() {
  await requireRole('owner')
  const [members, plans, trainers] = await Promise.all([getMembers(), getPlans(), getTrainers()])
  return <MembersClient initialMembers={members} plans={plans} trainers={trainers} />
}
