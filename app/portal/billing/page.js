import BillingClient from './billing-client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getMemberProfile } from '@/actions/db/members'
import { getGymSettings } from '@/actions/db/gyms'

export const metadata = {
    title: 'Billing & Dues',
}

export default async function BillingPage() {
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) redirect('/login')

    let user;
    try { user = JSON.parse(sessionStr) } catch { redirect('/login') }

    if (user.role !== 'member') {
        redirect('/dashboard') // Route owners away
    }

    // Fetch live member status and gym config
    const memberId = user.id || user.uid
    const [member, settings] = await Promise.all([
        getMemberProfile(memberId),
        getGymSettings(user.gymCode)
    ])

    if (!member) redirect('/login')

    return <BillingClient member={member} gymSettings={settings} user={user} />
}
