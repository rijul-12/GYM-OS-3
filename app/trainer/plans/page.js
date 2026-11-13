import TrainerPlansClient from './plans-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'
import { getMyGymSettings } from '@/actions/db/gyms'

export const metadata = { title: 'Workout Schedules' }

export default async function TrainerPlansPage() {
  const [members, settings] = await Promise.all([getAssignedMembers(), getMyGymSettings()])
  return <TrainerPlansClient initialMembers={members} zones={settings?.zones || []} />
}
