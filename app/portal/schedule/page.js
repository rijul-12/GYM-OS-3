import { cookies } from 'next/headers'
import { getMyProfile } from '@/actions/db/members'
import ScheduleClient from './schedule-client'

export default async function SchedulePage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('gymos_session')?.value

    let session = {}
    try { if (sessionCookie) session = JSON.parse(sessionCookie) } catch (e) { }

    const memberData = await getMyProfile()
    return <ScheduleClient initialData={memberData} />
}
