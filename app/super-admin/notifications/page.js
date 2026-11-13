import AnnouncementsClient from './announcements-client'
import { getAnnouncements } from '@/actions/db/superadmin'
import { getGyms } from '@/actions/db/gyms'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const [sent, gyms] = await Promise.all([getAnnouncements(), getGyms()])
  return <AnnouncementsClient sent={sent} gyms={gyms.map(g => ({ id: g.id, name: g.name }))} />
}
