import AttendanceLogsClient from './attendance-logs-client'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Attendance' }

export default async function AttendanceLogsPage() {
  await requireRole('owner')
  const logs = await getAttendanceLogs(500)
  return <AttendanceLogsClient initialLogs={logs} />
}
