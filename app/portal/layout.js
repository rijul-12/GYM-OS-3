import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Member Portal' }

export default async function PortalLayout({ children }) {
  await requireRole('member')
  return children
}
