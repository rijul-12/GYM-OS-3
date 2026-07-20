import { Suspense } from 'react'
import AnalyticsClient from './analytics-client'
import { getAnalyticsStats } from '@/actions/db/analytics'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function AnalyticsPage() {
  try {
    const stats = await getAnalyticsStats()
    return (
      <Suspense fallback={
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      }>
        <AnalyticsClient stats={stats} />
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
