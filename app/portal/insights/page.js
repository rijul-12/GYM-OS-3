import InsightsClient from './insights-client'
import { getMemberInsights } from '@/actions/db/insights'

export const metadata = { title: 'GymAI' }

export default async function InsightsPage() {
  let data
  try { data = await getMemberInsights() } catch { data = { available: false, insights: [], failed: true } }
  return <InsightsClient data={data} />
}
