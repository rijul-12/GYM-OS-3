import ImportClient from './import-client'
import { getImportHistory } from '@/actions/db/import'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Bring Your Data' }

export default async function ImportDataPage() {
  await requireRole('owner')
  return <ImportClient history={await getImportHistory()} />
}
