import MembershipClient from './membership-client'
import { getPlans } from '@/actions/db/plans'
import { getMyProfile } from '@/actions/db/members'

export const metadata = { title: 'Membership' }

export default async function MembershipPage() {
  const [plans, me] = await Promise.all([getPlans(), getMyProfile()])
  return <MembershipClient plans={plans} member={me} />
}
