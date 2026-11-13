import TrainerClient from './trainer-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'
import { getMyTrainerProfile } from '@/actions/db/trainers'
import { getDashboardStats } from '@/actions/db/gyms'
import { getAttendanceLogs } from '@/actions/db/attendance'

export default async function TrainerDashboardPage() {
  const [members, profile, live, logs] = await Promise.all([getAssignedMembers(), getMyTrainerProfile(), getDashboardStats(), getAttendanceLogs(30)])
  return <TrainerClient members={members} profile={profile} live={live} logs={logs} />
}
