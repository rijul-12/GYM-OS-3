import TrainerClient from './profile-client'
import { getMyTrainerProfile } from '@/actions/db/trainers'

export default async function ProfilePage() {
    const profile = await getMyTrainerProfile()
    return <TrainerClient trainer={profile} />
}
