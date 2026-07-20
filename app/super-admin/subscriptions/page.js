import { getSubscriptionRequests } from '@/actions/db/subscriptions'
import SubscriptionsClient from './subscriptions-client'
import { SUBSCRIPTION_STATS } from '@/lib/superadmin-mock' // We can keep mock stats if no real DB aggregations are built yet

export default async function SubscriptionsPage() {
    const requests = await getSubscriptionRequests();

    // Calculate simple real stats for the UI
    const activeReqs = requests.filter(r => r.status === 'Approved').length;
    const pendingReqs = requests.filter(r => r.status === 'Pending').length;

    const stats = {
        ...SUBSCRIPTION_STATS,
        active: activeReqs || SUBSCRIPTION_STATS.active,
        pendingPayments: pendingReqs
    }

    return <SubscriptionsClient initialRequests={requests} stats={stats} />
}
