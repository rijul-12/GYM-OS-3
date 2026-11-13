import FeedbackClient from './feedback-client'
import { getFeedback } from '@/actions/db/superadmin'

export const metadata = { title: 'Feedback' }

export default async function SupportPage() {
  return <FeedbackClient items={await getFeedback()} />
}
