'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal, formatTime } from '@/components/ui-kit'
import { completeMySession } from '@/actions/db/attendance'

/**
 * The member's active session with the Complete Session action.
 * Completion is a server update (checkout timestamp + status); the page data
 * is then refreshed in place — no reload.
 */
export function SessionCard({ session, primaryColor }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(null)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!session) return
    const tick = () => {
      const mins = Math.max(0, Math.round((Date.now() - new Date(session.check_in_time).getTime()) / 60000))
      setElapsed(mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`)
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [session])

  const complete = () => start(async () => {
    try {
      const res = await completeMySession()
      if (res?.error) { toast.error(res.error); return }
      setConfirm(false)
      setDone(res.alreadyCompleted ? { already: true } : { minutes: res.durationMinutes })
      toast.success(res.alreadyCompleted ? 'This session was already completed.' : 'Session completed')
      router.refresh()
    } catch { toast.error('Network error. Your session is still open — please try again.') }
  })

  if (!session) {
    if (!done) return null
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm" data-testid="session-done">
        <div className="font-medium text-emerald-400">Session completed</div>
        {!done.already && done.minutes !== undefined && <div className="text-foreground/60 mt-0.5">You trained for {done.minutes >= 60 ? `${Math.floor(done.minutes / 60)}h ${done.minutes % 60}m` : `${done.minutes} min`}.</div>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: `${primaryColor}55`, background: `${primaryColor}12` }} data-testid="active-session">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest" style={{ color: primaryColor }}>Active session</div>
          <div className="font-display text-xl font-bold mt-1">{session.actual_workout?.length ? session.actual_workout.join(' + ') : 'Workout in progress'}</div>
          <div className="text-xs text-foreground/60 mt-1">Checked in at {formatTime(session.check_in_time)} · {elapsed}</div>
        </div>
      </div>
      <Button className="w-full sm:w-auto mt-4 h-11 text-white border-0" style={{ background: primaryColor }} onClick={() => setConfirm(true)} data-testid="complete-session">Complete Session</Button>

      <Modal open={confirm} onClose={() => !pending && setConfirm(false)} title="Complete your session?"
        footer={<><Button variant="outline" disabled={pending} onClick={() => setConfirm(false)}>Not yet</Button><Button disabled={pending} onClick={complete} data-testid="confirm-complete">{pending ? 'Completing…' : 'Yes, complete session'}</Button></>}>
        <p className="text-sm text-foreground/70">This records your check-out time now ({elapsed} after check-in). To train again today you will need to scan the gym QR code again.</p>
      </Modal>
    </div>
  )
}
