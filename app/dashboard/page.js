import { Suspense } from 'react'
import DashboardClient from './dashboard-client'
import { getDashboardStats } from '@/actions/db/gyms'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function DashboardPage() {
  const { cookies } = await import('next/headers');
  const { redirect } = await import('next/navigation');
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('gymos_session')?.value;

  let shouldRedirect = false;
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session.role === 'owner') {
        const { adminDb } = await import('@/lib/firebase/server');
        if (adminDb && session.gymCode) {
          const settings = await adminDb.collection('gym_settings').doc(session.gymCode).get();
          if (!settings.exists || settings.data().onboarded !== true) {
            shouldRedirect = true;
          }
        }
      }
    } catch (e) { }
  }

  if (shouldRedirect) {
    redirect('/onboarding');
  }

  try {
    const [stats, attendance] = await Promise.all([
      getDashboardStats(),
      getAttendanceLogs(10) // Get the top 10 recent checkins/outs
    ])

    const inside = attendance.filter(a => a.check_out_time === null)

    return (
      <div className="flex flex-col space-y-4 p-4 lg:p-0">
        <Suspense fallback={
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        }>
          <DashboardClient stats={stats} latestAttendance={inside} />
        </Suspense>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <DataErrorState error={error} />
      </div>
    )
  }
}
