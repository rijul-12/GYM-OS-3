'use client'
import { PortalShell } from '@/components/portal-shell'
import { Empty } from '@/components/ui-kit'

/** Shown when a signed-in member has no member record (e.g. it was removed by the gym). */
export function MemberMissing({ title }) {
  return (
    <PortalShell title={title}>
      <Empty title="We could not find your membership record" hint="Your login works, but your gym no longer has a member profile linked to it. Please contact your gym's front desk." />
    </PortalShell>
  )
}
