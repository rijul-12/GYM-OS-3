import LandingClient from './landing-client'
import { getLandingStats, getPublicGyms } from '@/actions/db/public'
import { getPlatformPricing } from '@/lib/server/pricing'

export default async function Page() {
  const [stats, publicGyms, pricing] = await Promise.all([getLandingStats(), getPublicGyms(), getPlatformPricing()])
  return <LandingClient stats={stats} publicGyms={publicGyms} pricing={{ base: pricing.BASE_PLATFORM_FEE, perMember: pricing.ACTIVE_MEMBER_RATE, registration: pricing.REGISTRATION_FEE }} />
}
