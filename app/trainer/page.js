import { Suspense } from 'react'
import TrainerClient from './trainer-client'
import { getMembers } from '@/actions/db/members'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function TrainerDashboardPage() {
  try {
    // Thanks to user_metadata and RLS policies on Supabase, getMembers() implicitly
    // only returns members where trainer_id = auth.uid() when accessed by a trainer.
    const assignedMembers = await getMembers()

    return (
      <Suspense fallback={
        <div className="p-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      }>
        <TrainerClient members={assignedMembers} />
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

