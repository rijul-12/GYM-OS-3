import { Suspense } from 'react'
import PortalClient from './portal-client'
import { getMyProfile } from '@/actions/db/members'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { getDashboardStats } from '@/actions/db/gyms'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function PortalPage() {
  try {
    const [myProfile, attendance, stats] = await Promise.all([
      getMyProfile(),
      getAttendanceLogs(150),
      getDashboardStats()
    ])

    const inside = attendance.filter(a => a.check_out_time === null)
    const myCheckin = myProfile ? inside.find(a => a.member_id === myProfile.id) : null

    return (
      <Suspense fallback={
        <div className="p-6">
          <CardSkeleton />
        </div>
      }>
        <PortalClient member={myProfile} insideCount={inside.length} activeCheckin={myCheckin} zones={stats?.zones} dailyLine={stats?.dailyLine} />
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

