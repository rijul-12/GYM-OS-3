import { Suspense } from 'react'
import SuperAdminClient from './superadmin-client'
import { getGyms, getSuperAdminAnalytics } from '@/actions/db/gyms'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function SuperAdminPage() {
    try {
        const [gyms, analytics] = await Promise.all([
            getGyms(),
            getSuperAdminAnalytics()
        ])
        return (
            <Suspense fallback={
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
                </div>
            }>
                <SuperAdminClient gyms={gyms} analytics={analytics} />
            </Suspense>
        )
    } catch (error) {
        return (
            <div className="p-8">
                <DataErrorState error={{ message: error?.message || 'Server Error' }} />
            </div>
        )
    }
}

