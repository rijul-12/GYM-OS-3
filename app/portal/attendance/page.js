import { Suspense } from 'react'
import ClientView from './attendance-client'
import { getMyProfile } from '@/actions/db/members'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { getDashboardStats } from '@/actions/db/gyms'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function AttendancePage() {
  try {
    const [profile, attendance, stats] = await Promise.all([
      getMyProfile(),
      getAttendanceLogs(150),
      getDashboardStats()
    ])
    return (
      <Suspense fallback={<div className="p-8"><CardSkeleton /></div>}>
        <ClientView member={profile} globalAttendance={attendance} stats={stats} />
      </Suspense>
    )
  } catch (error) {
    return <div className="p-8"><DataErrorState error={{ message: error?.message || 'Server Error' }} /></div>
  }
}

