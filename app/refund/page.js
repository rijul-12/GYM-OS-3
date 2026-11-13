import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Refund Policy — BGM' }

export default function RefundPolicy() {
  return (
    <LegalPage title="Refund Policy" updated="November 2026">
      <section><h2>BGM subscriptions (gym owners)</h2><p>If you are not satisfied within 14 days of your first subscription payment, contact support and we will refund it. You can stop renewing at any time; access continues until the end of the period you paid for.</p></section>
      <section><h2>Gym membership fees (members)</h2><p>Membership fees are paid to your gym, not to BGM. Refunds of membership fees are decided and made by your gym — please contact them directly.</p></section>
      <section><h2>How refunds are returned</h2><p>Refunds of online payments go back to the original payment method through Razorpay and usually take 5–7 working days to appear.</p></section>
    </LegalPage>
  )
}
