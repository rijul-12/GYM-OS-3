import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Security — BGM' }

export default function Security() {
  return (
    <LegalPage title="Security">
      <section><h2>Access control</h2><p>Every request is checked on our servers against your signed-in account. Members can reach only their own records, trainers only the members assigned to them, and owners only their own gym.</p></section>
      <section><h2>Encryption</h2><p>All traffic uses HTTPS. Data is stored with Google Firebase, which encrypts it at rest.</p></section>
      <section><h2>Check-in QR codes</h2><p>Each gym has one QR code. Scanning it only works for a signed-in member of that gym with an active membership. An owner can regenerate the code at any time, which immediately invalidates the previous one.</p></section>
      <section><h2>Payments</h2><p>Online payments are processed by Razorpay and verified on our servers before any balance changes. BGM never stores card details. UPI transfers are marked as paid only after the gym owner confirms receipt.</p></section>
      <section><h2>Reporting a problem</h2><p>If you believe you have found a security issue, please e-mail support@gymos.app.</p></section>
    </LegalPage>
  )
}
