import ScheduleClient from './schedule-client'
import { getMyProfile } from '@/actions/db/members'
import { getMyGymSettings } from '@/actions/db/gyms'

export const metadata = { title: 'Workout Schedule' }

export default async function SchedulePage() {
  const [member, settings] = await Promise.all([getMyProfile(), getMyGymSettings()])
  return <ScheduleClient member={member} zones={settings?.zones || []} />
}
