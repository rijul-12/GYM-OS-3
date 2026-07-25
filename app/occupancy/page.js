import { Suspense } from 'react'
import OccupancyClient from './occupancy-client'
import { getOccupancyStats } from '@/actions/db/occupancy'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function OccupancyPage() {
  try {
    const stats = await getOccupancyStats()

    return (
      <Suspense fallback={
        <div className="p-8 space-y-6">
          <CardSkeleton /><CardSkeleton />
        </div>
      }>
        <OccupancyClient stats={stats} />
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

