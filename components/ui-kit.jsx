'use client'
// Small presentational helpers shared by the portal pages.

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5 min-w-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-foreground/50 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 min-w-0">
      <div className="text-[11px] uppercase tracking-widest text-foreground/50 truncate">{label}</div>
      <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums truncate" style={tone ? { color: tone } : undefined}>{value}</div>
      {hint && <div className="text-xs text-foreground/40 mt-0.5 truncate">{hint}</div>}
    </div>
  )
}

export function Empty({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-foreground/50 mt-1 max-w-md mx-auto">{hint}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

const STATUS_TONE = {
  Active: 'bg-emerald-500/15 text-emerald-400', Paid: 'bg-emerald-500/15 text-emerald-400', PAID: 'bg-emerald-500/15 text-emerald-400', COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400', Partial: 'bg-amber-500/15 text-amber-400', Invited: 'bg-amber-500/15 text-amber-400', PENDING_VERIFICATION: 'bg-amber-500/15 text-amber-400', COMPLETED_WITH_ERRORS: 'bg-amber-500/15 text-amber-400', Trial: 'bg-amber-500/15 text-amber-400',
  Expired: 'bg-red-500/15 text-red-400', Unpaid: 'bg-red-500/15 text-red-400', Suspended: 'bg-red-500/15 text-red-400', REJECTED: 'bg-red-500/15 text-red-400', FAILED: 'bg-red-500/15 text-red-400', REFUNDED: 'bg-red-500/15 text-red-400',
}
const STATUS_LABEL = { PENDING_VERIFICATION: 'Pending verification', PAID: 'Paid', REJECTED: 'Rejected', REFUNDED: 'Refunded', FAILED: 'Failed', COMPLETED: 'Completed', COMPLETED_WITH_ERRORS: 'Completed with errors', Pending_Payment: 'Payment pending' }

export function StatusBadge({ status }) {
  if (!status) return null
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_TONE[status] || 'bg-foreground/10 text-foreground/60'}`}>{STATUS_LABEL[status] || status}</span>
}

/** Modal dialog that is usable on small screens: full-height sheet on mobile, scrollable body, safe-area aware. */
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92dvh] flex flex-col bg-background border border-foreground/10 rounded-t-2xl sm:rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-foreground/10 shrink-0">
          <h2 className="font-display font-semibold truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-lg text-foreground/60 hover:bg-foreground/[0.06]">✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-foreground/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs text-foreground/60">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="text-[11px] text-red-400 mt-1 block">{error}</span> : hint ? <span className="text-[11px] text-foreground/40 mt-1 block">{hint}</span> : null}
    </label>
  )
}

export const inputClass = 'w-full h-11 rounded-lg bg-foreground/[0.04] border border-foreground/10 px-3 text-base sm:text-sm outline-none focus:border-foreground/30'

export const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(String(d).length === 10 ? `${d}T12:00:00` : d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const formatTime = (d) => {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
export const formatMoney = (n, symbol = '₹') => `${symbol}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
