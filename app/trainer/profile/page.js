import TrainerProfileClient from './profile-client'
import { getMyTrainerProfile } from '@/actions/db/trainers'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  return <TrainerProfileClient trainer={await getMyTrainerProfile()} />
}
