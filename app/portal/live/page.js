import LiveClient from './live-client'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { getDashboardStats } from '@/actions/db/gyms'

export default async function LivePage() {
  try {
    const [attendance, stats] = await Promise.all([
      getAttendanceLogs(150),
      getDashboardStats()
    ])

    const insideCount = attendance.filter(a => a.check_out_time === null).length;

    return (
      <LiveClient
        insideCount={insideCount}
        zones={stats?.zones || []}
        dailyLine={stats?.dailyLine || []}
        dist={stats?.dist || []}
      />
    )
  } catch (e) {
    return <div>Error loading live telemetry.</div>
  }
}
