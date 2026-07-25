import { getSubscriptionRequests } from '@/actions/db/subscriptions'
import SubscriptionsClient from './subscriptions-client'

export default async function SubscriptionsPage() {
    const requests = await getSubscriptionRequests();

    // Calculate simple real stats for the UI
    const activeReqs = requests.filter(r => r.status === 'Approved').length;
    const pendingReqs = requests.filter(r => r.status === 'Pending').length;

    const stats = {
        active: activeReqs || 0,
        totalMRR: 0,
        pendingPayments: pendingReqs || 0,
        upcomingRenewals: 0
    }

    return <SubscriptionsClient initialRequests={requests} stats={stats} />
}
