'use client'
import { WEEK_ORDER, MUSCLE_GROUPS } from '@/lib/domain/schedule'

/**
 * Weekly workout schedule editor used by owner, trainer and member.
 * Several muscle groups can be selected per day; a day with none is a rest
 * day. "No fixed schedule" clears the plan and lets the member pick at check-in.
 */
export function ScheduleEditor({ value, noFixedSchedule, onChange, options = MUSCLE_GROUPS, disabled = false }) {
  const schedule = value || {}
  const toggle = (day, group) => {
    const current = Array.isArray(schedule[day]) ? schedule[day] : []
    const next = current.includes(group) ? current.filter(g => g !== group) : [...current, group]
    onChange({ noFixedSchedule: false, schedule: { ...schedule, [day]: next } })
  }
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 accent-red-500" checked={!!noFixedSchedule} disabled={disabled}
          onChange={(e) => onChange({ noFixedSchedule: e.target.checked, schedule })} data-testid="no-fixed-schedule" />
        <span className="text-sm"><span className="font-medium">No Fixed Schedule</span><span className="block text-xs text-foreground/50">Choose the workout at check-in each day.</span></span>
      </label>
      {!noFixedSchedule && (
        <div className="space-y-2">
          {WEEK_ORDER.map(day => {
            const selected = Array.isArray(schedule[day]) ? schedule[day] : []
            return (
              <div key={day} className="rounded-xl border border-foreground/10 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{day}</span>
                  <span className="text-[11px] text-foreground/40">{selected.length ? selected.join(' + ') : 'Rest day'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {options.map(group => {
                    const on = selected.includes(group)
                    return (
                      <button key={group} type="button" disabled={disabled} aria-pressed={on} onClick={() => toggle(day, group)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${on ? 'bg-foreground text-background border-foreground' : 'border-foreground/15 text-foreground/70 hover:border-foreground/40'}`}>
                        {group}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
