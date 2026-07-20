import { Suspense } from 'react'
import GymsClient from './gyms-client'
import { getGyms } from '@/actions/db/gyms'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function GymsPage() {
    try {
        const gyms = await getGyms()
        return (
            <Suspense fallback={
                <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <CardSkeleton /><CardSkeleton /><CardSkeleton />
                </div>
            }>
                <GymsClient initialGyms={gyms} />
            </Suspense>
        )
    } catch (error) {
        return (
            <div className="p-8">
                <DataErrorState error={error} />
            </div>
        )
    }
}
