import { Suspense } from 'react'
import TrainerMembersClient from './members-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'
import { ListSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function TrainerMembersPage() {
  try {
    const members = await getAssignedMembers()
    return (
      <Suspense fallback={<ListSkeleton count={8} />}>
        <TrainerMembersClient initialMembers={members} />
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

