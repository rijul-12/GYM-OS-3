import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Trainer Portal' }

export default async function TrainerLayout({ children }) {
  await requireRole('trainer')
  return children
}
