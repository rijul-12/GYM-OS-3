import OnboardingClient from './onboarding-client'
import { redirect } from 'next/navigation'
import { requireRole, getGymContext, gymDisplayName } from '@/lib/server/session'

export const metadata = { title: 'Set up your gym' }

export default async function OnboardingPage() {
  const session = await requireRole('owner')
  const { gym, settings } = await getGymContext(session.gymId)
  if (settings.onboarded !== false) redirect('/dashboard')
  return <OnboardingClient gymName={gymDisplayName(gym)} gymCode={gym?.gymCode || session.gymId} capacity={settings.buildingCapacity || ''} />
}
