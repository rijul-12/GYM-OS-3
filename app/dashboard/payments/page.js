import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PaymentsClient from './payments-client'

export const metadata = {
    title: 'Payment Verification',
}

export default async function PaymentsPage() {
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) redirect('/login')

    let user;
    try { user = JSON.parse(sessionStr) } catch { redirect('/login') }

    if (user.role !== 'owner' && user.role !== 'superadmin') {
        redirect('/portal')
    }

    return <PaymentsClient user={user} />
}
