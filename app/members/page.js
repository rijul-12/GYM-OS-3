import { Suspense } from 'react'
import MembersClient from './members-client'
import { getMembers } from '@/actions/db/members'
import { ListSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function MembersPage() {
  try {
    const members = await getMembers()
    return (
      <Suspense fallback={<ListSkeleton count={12} />}>
        <MembersClient initialMembers={members} />
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

