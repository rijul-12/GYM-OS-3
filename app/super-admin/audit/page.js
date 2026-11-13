import { SuperAdminShell } from '@/components/superadmin-shell'
import { getAuditLogs } from '@/actions/db/superadmin'

export const metadata = { title: 'Audit Logs' }

export default async function AuditPage() {
  const logs = await getAuditLogs(300)
  return (
    <SuperAdminShell title="Audit Logs" subtitle="Sensitive actions across the platform (latest 300)">
      {logs.length === 0 ? <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center text-sm text-foreground/50">No audited actions yet.</div> : (
        <ul className="divide-y divide-foreground/5 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
          {logs.map(l => (
            <li key={l.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4"><span className="font-mono text-xs font-semibold">{l.action}</span><time className="text-[11px] text-foreground/50">{l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</time></div>
              <div className="text-[11px] text-foreground/50 break-all">{l.actorRole} {l.actorUid}{l.gymId ? ` · gym ${l.gymId}` : ''}</div>
              {l.detail && l.detail !== '{}' && <div className="text-[11px] text-foreground/40 break-all mt-0.5">{l.detail}</div>}
            </li>
          ))}
        </ul>
      )}
    </SuperAdminShell>
  )
}
