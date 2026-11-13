import { Suspense } from 'react'
import SettingsClient from './settings-client'
import { requireRole } from '@/lib/server/session'
import { computeMonthlyCost } from '@/lib/server/pricing'
import { razorpayConfigStatus } from '@/lib/server/payments'
import { getAppUrl } from '@/lib/url-builder'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await requireRole('owner')
  const cost = await computeMonthlyCost(session.gymId)
  return <Suspense><SettingsClient cost={cost} razorpayConfigured={razorpayConfigStatus().configured} appUrl={getAppUrl()} /></Suspense>
}
