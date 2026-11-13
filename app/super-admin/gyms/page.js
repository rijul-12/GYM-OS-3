import GymsClient from './gyms-client'
import { getGyms } from '@/actions/db/gyms'

export const metadata = { title: 'Gyms' }

export default async function GymsPage() {
  return <GymsClient initialGyms={await getGyms()} />
}
