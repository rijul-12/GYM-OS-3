import AttendanceClient from './attendance-client'
import { getMyProfile } from '@/actions/db/members'

export const metadata = { title: 'Attendance' }

export default async function AttendancePage() {
  return <AttendanceClient member={await getMyProfile()} />
}
