import { getSubscriptionStatus } from '@/actions/db/subscriptions'
import { cookies } from 'next/headers'
import SubscriptionClient from './subscription-client'

export default async function SubscriptionPage() {
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    let gymId = 'DEMO'
    if (sessionStr) {
        try {
            gymId = JSON.parse(sessionStr).gymCode || 'DEMO'
        } catch (e) { }
    }

    const subStatus = await getSubscriptionStatus(gymId)

    return <SubscriptionClient status={subStatus} gymId={gymId} />
}
