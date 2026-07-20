import { Suspense } from 'react'
import { Dumbbell } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { cookies } from 'next/headers'
import { adminDb } from '@/lib/firebase/server'
import { redirect } from 'next/navigation'
import EquipmentsClient from './equipments-client'

export default async function EquipmentsPage() {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('gymos_session')?.value;
    if (!sessionStr) redirect('/login');
    const session = JSON.parse(sessionStr);
    const gymCode = session.gymCode || 'DEMO';

    let equipment = {}

    try {
        if (adminDb) {
            const settingsDoc = await adminDb.collection('gym_settings').doc(gymCode).get()
            if (settingsDoc.exists) {
                equipment = settingsDoc.data().equipment || {}
            }
        }
    } catch (e) {
        console.error(e)
    }

    return (
        <DashShell
            title="Facility Equipment"
            subtitle="Manage your physical hardware quotas and machinery inventory."
            actions={
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/5 border border-foreground/10 text-foreground/50">
                    <Dumbbell className="h-5 w-5" />
                </div>
            }
        >
            <div className="max-w-4xl mx-auto mt-6">
                <EquipmentsClient initialData={equipment} gymCode={gymCode} />
            </div>
        </DashShell>
    )
}
