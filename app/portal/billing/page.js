import BillingClient from './billing-client'
import { getMemberPaymentContext } from '@/actions/payments'

export const metadata = { title: 'Payments & Dues' }

export default async function BillingPage() {
  return <BillingClient ctx={await getMemberPaymentContext()} />
}
