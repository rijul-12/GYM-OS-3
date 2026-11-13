import { LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Privacy Policy — BGM' }

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2026">
      <section><h2>Who we are</h2><p>BGM (Best Gym Manager) is gym management software used by gym owners, their trainers and their members. The gym you belong to decides which members and trainers are added to its account.</p></section>
      <section><h2>Information we store</h2><ul>
        <li>Account details: name, e-mail address, phone number and, if you add one, a profile photo.</li>
        <li>Membership details entered by your gym: plan, start and expiry dates, fees, payments and outstanding balance.</li>
        <li>Attendance: check-in and check-out times and the workout you selected.</li>
        <li>Workout schedules, trainer notes and progress measurements.</li>
        <li>For gym owners: gym profile, settings and subscription payments to BGM.</li>
      </ul></section>
      <section><h2>Who can see it</h2><ul>
        <li>Members see only their own profile, attendance and payments.</li>
        <li>Trainers see the members assigned to them, without payment details.</li>
        <li>Gym owners see the records of their own gym only.</li>
        <li>BGM staff access data only to operate and support the service.</li>
      </ul></section>
      <section><h2>Service providers</h2><p>Data is stored with Google Firebase (authentication, database, file storage) and the application is hosted on Vercel. Online payments are processed by Razorpay; we do not store card details. E-mail and SMS are delivered through our messaging providers.</p></section>
      <section><h2>Deleting your account</h2><p>Members and trainers can delete their account from the Profile page; gym owners can delete their gym from Settings. Your profile, photo, attendance and login are erased. Payment records are kept in anonymised form because gyms and BGM are required to keep accounting records, and transactions held by Razorpay remain subject to Razorpay’s own retention rules.</p></section>
      <section><h2>Your choices</h2><p>You can correct your details in your profile, or ask your gym or BGM support to do so.</p></section>
    </LegalPage>
  )
}
