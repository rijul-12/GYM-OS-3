'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { SuperAdminShell } from '@/components/superadmin-shell'
import { Button } from '@/components/ui/button'
import { Card, Modal, Empty } from '@/components/ui-kit'
import { adminScanOrphans, executeOrphanCleanupServerAction } from '@/actions/db/reconciliation'

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(false)
  const [orphans, setOrphans] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const scan = async () => {
    setLoading(true)
    try { setOrphans(await adminScanOrphans()) } catch { toast.error('The scan failed.') } finally { setLoading(false) }
  }
  const clean = async () => {
    setLoading(true)
    try {
      const res = await executeOrphanCleanupServerAction(confirm.uid, confirm.kind)
      if (!res?.success) toast.error(res?.error || 'Cleanup failed.')
      else toast.success('Record cleaned up')
      setConfirm(null)
      await scan()
    } finally { setLoading(false) }
  }
  const all = orphans ? [...orphans.owners.map(o => ({ ...o, type: 'Owner', kind: 'uid' })), ...orphans.members.map(o => ({ ...o, type: 'Member' })), ...orphans.trainers.map(o => ({ ...o, type: 'Trainer' }))] : []

  return (
    <SuperAdminShell title="Data Cleaning" subtitle="Find profile records whose login or gym no longer exists" actions={<Button className="h-10" disabled={loading} onClick={scan}>{loading ? 'Working…' : 'Scan'}</Button>}>
      {orphans === null ? <Empty title="Run a scan" hint="The scan compares member, trainer and gym records against Firebase Authentication. Nothing is changed until you clean a record yourself." /> :
        all.length === 0 ? <Empty title="No orphaned records found" /> : (
          <Card title={`${all.length} orphaned record${all.length === 1 ? '' : 's'}`}>
            <ul className="divide-y divide-foreground/5 -my-2">
              {all.map((o, i) => (
                <li key={`${o.uid}-${i}`} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0"><div className="truncate">{o.type} · {o.email || '(no e-mail)'}</div><div className="text-[11px] text-foreground/50 truncate">{o.reason} · {o.uid}</div></div>
                  <Button variant="outline" className="h-9 text-xs text-red-400" disabled={loading} onClick={() => setConfirm(o)}>Clean up</Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Clean up this record?" footer={<><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={loading} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={clean}>Delete record</Button></>}>
        <p className="text-sm text-foreground/70">{confirm?.type === 'Owner' ? 'This deletes the whole gym that belonged to this owner, including its members and trainers.' : 'This deletes the profile and its attendance.'} Payment records are retained in anonymised form. This cannot be undone.</p>
      </Modal>
    </SuperAdminShell>
  )
}
