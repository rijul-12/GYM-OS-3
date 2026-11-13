import PaymentsClient from './payments-client'
import { getMemberTransactions } from '@/actions/db/member_payments'
import { requireRole, getGymContext } from '@/lib/server/session'
import { razorpayConfigStatus } from '@/lib/server/payments'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const session = await requireRole('owner')
  const [transactions, ctx] = await Promise.all([getMemberTransactions(), getGymContext(session.gymId)])
  return <PaymentsClient transactions={transactions} symbol={String(ctx.settings.currency || '₹ INR').split(' ')[0]} options={{ upi: !!ctx.settings.upi_enabled, razorpay: !!ctx.settings.razorpay_enabled, razorpayConfigured: razorpayConfigStatus().configured }} />
}
