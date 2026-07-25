import { Suspense } from 'react'
import MembershipClient from './membership-client'
import { getPlans } from '@/actions/db/plans'
import { getMyProfile } from '@/actions/db/members'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function MembershipPage() {
  try {
    const [plans, me] = await Promise.all([
      getPlans(),
      getMyProfile()
    ]);

    return (
      <Suspense fallback={
        <div className="p-8">
          <CardSkeleton />
        </div>
      }>
        <MembershipClient plans={plans} meProfile={me} />
      </Suspense>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <DataErrorState error={{ message: error?.message || 'Server Error' }} />
      </div>
    )
  }
}

