import { Suspense } from 'react'
import AttendanceLogsClient from './attendance-logs-client'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { TableSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function AttendanceLogsPage() {
  try {
    const logs = await getAttendanceLogs(150)
    return (
      <Suspense fallback={
        <div className="p-6">
          <TableSkeleton columns={7} rows={12} />
        </div>
      }>
        <AttendanceLogsClient initialLogs={logs} />
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

