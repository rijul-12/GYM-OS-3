import SettingsClient from './settings-client'
import { getPricingSettings } from '@/actions/db/superadmin'

export const metadata = { title: 'Settings' }

export default async function SuperAdminSettingsPage() {
  return <SettingsClient pricing={await getPricingSettings()} />
}
