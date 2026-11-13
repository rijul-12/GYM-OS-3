import SubscriptionClient from './subscription-client'
import { requireRole, getGymContext } from '@/lib/server/session'
import { computeSubscriptionStatus } from '@/lib/server/subscription'
import { computeMonthlyCost } from '@/lib/server/pricing'
import { razorpayConfigStatus } from '@/lib/server/payments'
import { getGymBillingHistory } from '@/actions/payments'

export const metadata = { title: 'BGM Subscription' }

export default async function SubscriptionPage() {
  const session = await requireRole('owner')
  const [status, cost, history, ctx] = await Promise.all([
    computeSubscriptionStatus(session.gymId), computeMonthlyCost(session.gymId), getGymBillingHistory(), getGymContext(session.gymId),
  ])
  return <SubscriptionClient status={status} cost={cost} history={history} razorpay={razorpayConfigStatus()} owner={{ name: ctx.gym?.ownerName || session.name, email: session.email }} />
}
