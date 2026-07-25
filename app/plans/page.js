import { Suspense } from 'react'
import PlansClient from './plans-client'
import { getPlans } from '@/actions/db/plans'
import { getMembers } from '@/actions/db/members'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function PlansPage() {
  try {
    const [plans, members] = await Promise.all([
      getPlans(),
      getMembers()
    ])

    return (
      <Suspense fallback={
        <div className="grid md:grid-cols-3 gap-4 p-8">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      }>
        <PlansClient initialPlans={plans} members={members} />
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

