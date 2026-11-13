import IntegrationsClient from './integrations-client'
import { getIntegrationStatus } from '@/actions/db/settings'
import { requireRole, getGymContext } from '@/lib/server/session'
import { getAppUrl } from '@/lib/url-builder'

export const metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
  const session = await requireRole('owner')
  const [status, ctx] = await Promise.all([getIntegrationStatus(), getGymContext(session.gymId)])
  return <IntegrationsClient status={status} gymCode={ctx.gym?.gymCode || session.gymId} appUrl={getAppUrl()} />
}
