import TrainerProgressClient from './progress-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'

export const metadata = { title: 'Progress' }

export default async function TrainerProgressPage() {
  return <TrainerProgressClient initialMembers={await getAssignedMembers()} />
}
