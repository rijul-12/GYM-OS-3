import SubscriptionsClient from './subscriptions-client'
import { getSubscriptionRequests } from '@/actions/db/subscriptions'
import { getGyms } from '@/actions/db/gyms'

export const metadata = { title: 'Subscriptions' }

export default async function SubscriptionsPage() {
  const [requests, gyms] = await Promise.all([getSubscriptionRequests(), getGyms()])
  return <SubscriptionsClient requests={requests} gyms={gyms} />
}
