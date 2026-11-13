'use client'
import { TrainerShell } from '@/components/trainer-shell'
import { ZoneDemandGrid, OccupancyCard } from '@/components/zone-demand'
import { Card } from '@/components/ui-kit'
import { UserAvatar } from '@/components/user-avatar'
import { useLiveRefresh } from '@/components/use-live-refresh'

export default function LiveClient({ live, members }) {
  useLiveRefresh(20000)
  const inside = members.filter(m => m.checkedIn)
  return (
    <TrainerShell title="Live Gym" subtitle="Occupancy and workout demand right now">
      <div className="grid lg:grid-cols-3 gap-4">
        <OccupancyCard insideCount={live.insideCount} capacity={live.capacity} asOf={live.asOf} />
        <Card className="lg:col-span-2" title={`Your members in the gym (${inside.length})`}>
          {inside.length === 0 ? <div className="text-sm text-foreground/40">None of your members is checked in right now.</div> : (
            <ul className="grid sm:grid-cols-2 gap-3">{inside.map(m => <li key={m.id} className="flex items-center gap-3"><UserAvatar src={m.photoURL} name={m.name} size={34} /><span className="text-sm truncate">{m.name}</span></li>)}</ul>
          )}
        </Card>
      </div>
      <div className="mt-5"><h2 className="text-sm font-semibold mb-2">Workout demand</h2><ZoneDemandGrid zones={live.zones} /></div>
    </TrainerShell>
  )
}
