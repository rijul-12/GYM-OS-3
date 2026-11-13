import TrainerMembersClient from './members-client'
import { getAssignedMembers } from '@/actions/db/trainer_operations'

export const metadata = { title: 'Assigned Members' }

export default async function TrainerMembersPage() {
  return <TrainerMembersClient initialMembers={await getAssignedMembers()} />
}
