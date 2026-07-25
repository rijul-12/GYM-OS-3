import { Suspense } from 'react'
import LiveClient from './live-client'
import { getDashboardStats } from '@/actions/db/gyms'
import { getAttendanceLogs } from '@/actions/db/attendance'
import { getAssignedMembers } from '@/actions/db/trainer_operations'
import { CardSkeleton, DataErrorState } from '@/components/ui/skeletons'

export default async function TrainerLivePage() {
    try {
        const [stats, attendance, members] = await Promise.all([
            getDashboardStats(),
            getAttendanceLogs(150),
            getAssignedMembers()
        ])

        const inside = attendance.filter(a => a.check_out_time === null)

        return (
            <Suspense fallback={
                <div className="p-6">
                    <CardSkeleton />
                </div>
            }>
                <LiveClient stats={stats} attendance={inside} members={members} />
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

