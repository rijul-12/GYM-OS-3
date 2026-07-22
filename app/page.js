import LandingClient from './landing-client'
import { getLandingStats, getPublicGyms } from '@/actions/db/public'

export default async function Page() {
    const [stats, publicGyms] = await Promise.all([
        getLandingStats(),
        getPublicGyms()
    ])

    return <LandingClient stats={stats} publicGyms={publicGyms} />
}
