import { Suspense } from 'react'
import MembershipClient from './membership-client'
import { getPlans } from '@/actions/db/plans'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function MembershipPage() {
  try {
    const plans = await getPlans()
    return (
      <Suspense fallback={
        <div className="p-8">
          <CardSkeleton />
        </div>
      }>
        <MembershipClient plans={plans} />
      </Suspense>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <DataErrorState error={error} />
      </div>
    )
  }
}
