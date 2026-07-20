import { Suspense } from 'react'
import TrainerPlansClient from './plans-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'
import { ListSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function TrainerPlansPage() {
  try {
    const members = await getAssignedMembers()
    return (
      <Suspense fallback={<ListSkeleton count={4} />}>
        <TrainerPlansClient initialMembers={members} />
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
