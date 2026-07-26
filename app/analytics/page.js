import { Suspense } from 'react'
import AnalyticsClient from './analytics-client'
import { getAnalyticsStats } from '@/actions/db/analytics'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function AnalyticsPage() {
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
      getAnalyticsStats(),
      getSubscriptionStatus(gymId)
    ]);
    return (
      <Suspense fallback={
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      }>
        <AnalyticsClient stats={stats} subscription={subscription} />
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

