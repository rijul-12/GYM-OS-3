import ProfileClient from './profile-client'
import { getMyProfile } from '@/actions/db/members'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  return <ProfileClient member={await getMyProfile()} />
}
