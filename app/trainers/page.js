import { Suspense } from 'react'
import TrainersClient from './trainers-client'
import { getTrainers } from '@/actions/db/trainers'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function TrainersPage() {
  try {
    const trainers = await getTrainers()
    return (
      <Suspense fallback={
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-8">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      }>
        <TrainersClient initialTrainers={trainers} />
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
