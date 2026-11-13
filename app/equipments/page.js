import EquipmentsClient from './equipments-client'
import { getGymEquipment } from '@/actions/db/gyms'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Equipment' }

export default async function EquipmentsPage() {
  await requireRole('owner')
  return <EquipmentsClient initialData={await getGymEquipment()} />
}
