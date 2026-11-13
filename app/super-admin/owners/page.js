import { SuperAdminShell } from '@/components/superadmin-shell'
import { getOwners } from '@/actions/db/superadmin'

export const metadata = { title: 'Owners' }
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Never')

export default async function OwnersPage() {
  const owners = await getOwners()
  return (
    <SuperAdminShell title="Owners" subtitle={`${owners.length} gym owner${owners.length === 1 ? '' : 's'}`}>
      {owners.length === 0 ? <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center text-sm text-foreground/50">No owners yet.</div> : (
        <ul className="space-y-3">
          {owners.map(o => (
            <li key={o.gymId} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 text-sm">
              <div className="font-medium">{o.name || '—'} <span className="text-foreground/50 font-normal">· {o.gymName}</span></div>
              <div className="text-xs text-foreground/50 mt-1 break-words">{o.email}{o.phone ? ` · ${o.phone}` : ''}</div>
              <div className="text-xs text-foreground/50">
                {o.hasLogin ? `Last sign-in: ${fmt(o.lastSignIn)} · e-mail ${o.emailVerified ? 'verified' : 'not verified'}${o.disabled ? ' · login disabled' : ''}` : 'No login found for this gym — see Data Cleaning'} · gym {o.gymStatus}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SuperAdminShell>
  )
}
