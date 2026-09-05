import ImportClient from './import-client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Bring Your Data - BGM',
}

export default async function ImportDataPage() {
    const sessionStr = (await cookies()).get('gymos_session')?.value
    if (!sessionStr) redirect('/login')

    let user;
    try { user = JSON.parse(sessionStr) } catch { redirect('/login') }

    if (user.role !== 'owner' && user.role !== 'superadmin') {
        redirect('/portal')
    }

    return <ImportClient user={user} />
}
