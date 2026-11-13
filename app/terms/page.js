import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Terms of Service — BGM' }

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">
      <section><h2>The service</h2><p>BGM provides software for running a gym: memberships, attendance, trainers, schedules and payments. By creating an account you agree to these terms.</p></section>
      <section><h2>Gym owners</h2><ul>
        <li>You are responsible for the members and trainers you add and for the accuracy of the records you keep.</li>
        <li>New gyms receive a free trial. After it ends, the account is read-only until a subscription is paid.</li>
        <li>Subscription pricing is shown on the pricing section of our website and on your subscription page before you pay.</li>
        <li>Payments your members make to you are between you and your members. When you confirm a UPI transfer you are confirming that you received the money.</li>
      </ul></section>
      <section><h2>Trainers and members</h2><p>Your access is granted by your gym, which can change or remove it. Use your own account only and keep your password private.</p></section>
      <section><h2>Acceptable use</h2><p>Do not attempt to access another gym’s or another person’s data, interfere with the service, or use it for unlawful purposes.</p></section>
      <section><h2>Availability</h2><p>We work to keep BGM available and your data safe, but the service is provided without a guarantee of uninterrupted availability.</p></section>
      <section><h2>Governing law</h2><p>These terms are governed by the laws of India.</p></section>
    </LegalPage>
  )
}
