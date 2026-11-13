import TrainersClient from './trainers-client'
import { getTrainers } from '@/actions/db/trainers'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Trainers' }

export default async function TrainersPage() {
  await requireRole('owner')
  return <TrainersClient initialTrainers={await getTrainers()} />
}
