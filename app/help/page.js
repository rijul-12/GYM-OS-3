import Link from 'next/link'
import { DashShell } from '@/components/dash-shell'
import { requireRole } from '@/lib/server/session'

export const metadata = { title: 'Help' }

const TOPICS = [
  { title: 'Set up QR check-in', href: '/settings?tab=attendance', text: 'Download or print your gym QR code and place it at the entrance. Members scan it with their phone camera.' },
  { title: 'Add or approve members', href: '/members', text: 'Add members yourself, or approve people who registered with your gym code. Each member reviews on one screen before saving.' },
  { title: 'Import existing members', href: '/dashboard/import', text: 'Upload a CSV or Excel export from your previous software, match the columns and confirm the preview.' },
  { title: 'Take payments', href: '/settings?tab=billing', text: 'Choose whether members can pay by direct UPI and/or online, and verify UPI transfers under Payments.' },
  { title: 'Invite trainers', href: '/trainers', text: 'Invite a trainer by e-mail, then assign members to them from the Members page.' },
  { title: 'Facilities and workout demand', href: '/settings?tab=widgets', text: 'Define your zones (and optional capacities) to see which muscle groups are in demand right now.' },
]

export default async function HelpCenter() {
  await requireRole('owner')
  return (
    <DashShell title="Help" subtitle="How to get things done in BGM">
      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl">
        {TOPICS.map(t => (
          <Link key={t.title} href={t.href} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 hover:border-foreground/25 transition">
            <div className="font-display font-semibold">{t.title}</div>
            <p className="text-sm text-foreground/60 mt-1">{t.text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 max-w-4xl rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 text-sm">
        <div className="font-display font-semibold">Need a person?</div>
        <p className="text-foreground/60 mt-1">E-mail <a className="underline" href="mailto:support@gymos.app">support@gymos.app</a>, or use “Send Feedback” in the menu — it reaches the BGM team directly.</p>
      </div>
    </DashShell>
  )
}
