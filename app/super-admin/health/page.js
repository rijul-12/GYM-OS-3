import { SuperAdminShell } from '@/components/superadmin-shell'
import { getPlatformHealth } from '@/actions/db/superadmin'

export const metadata = { title: 'System Health' }
export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const health = await getPlatformHealth()
  const checks = health?.checks || []
  return (
    <SuperAdminShell title="System Health" subtitle="Which integrations this deployment is configured for">
      <ul className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
        {checks.map(c => (
          <li key={c.name} className="px-4 py-3 flex items-start gap-3 text-sm">
            <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${c.ok ? 'bg-emerald-400' : 'bg-red-400'}`} aria-label={c.ok ? 'OK' : 'Needs attention'} />
            <div className="min-w-0"><div className="font-medium">{c.name}</div><div className="text-xs text-foreground/50 break-words">{c.detail}</div></div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-foreground/40 mt-3">This page reports configuration only (names of missing environment variables, never their values). It does not measure uptime.</p>
    </SuperAdminShell>
  )
}
