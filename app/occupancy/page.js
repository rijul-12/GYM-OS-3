import { Suspense } from 'react'
import OccupancyClient from './occupancy-client'
import { getOccupancyStats } from '@/actions/db/occupancy'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function OccupancyPage() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('gymos_session')?.value;
  let gymId = 'DEMO';
  if (sessionStr) {
    try { gymId = JSON.parse(sessionStr).gymCode || 'DEMO'; } catch (e) { }
  }

  try {
    const { getSubscriptionStatus } = await import('@/actions/db/subscriptions');
    const [stats, subscription] = await Promise.all([
      getOccupancyStats(),
      getSubscriptionStatus(gymId)
    ]);

    return (
      <Suspense fallback={
        <div className="p-8 space-y-6">
          <CardSkeleton /><CardSkeleton />
        </div>
      }>
        <OccupancyClient stats={stats} subscription={subscription} />
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

