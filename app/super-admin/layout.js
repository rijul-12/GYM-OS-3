import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Super Admin' }

export default async function SuperAdminLayout({ children }) {
  await requireRole('super_admin')
  return children
}
