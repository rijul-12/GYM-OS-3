'use client'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { PortalShell } from '@/components/portal-shell'
import { useBrand } from '@/components/brand-provider'
import { ZoneDemandGrid, OccupancyCard } from '@/components/zone-demand'
import { Card } from '@/components/ui-kit'
import { useLiveRefresh } from '@/components/use-live-refresh'

export default function LiveClient({ live }) {
  const { brand } = useBrand()
  useLiveRefresh(20000)
  const hasToday = (live.dailyLine || []).some(d => d.v > 0)
  return (
    <PortalShell title="Live Gym">
      <div className="space-y-4 max-w-3xl mx-auto">
        <OccupancyCard insideCount={live.insideCount} capacity={live.capacity} asOf={live.asOf} />
        <div>
          <h2 className="text-sm font-semibold mb-1">What people are training</h2>
          <p className="text-xs text-foreground/50 mb-2">Members in the gym right now, by the muscle groups they chose at check-in.</p>
          <ZoneDemandGrid zones={live.zones} compact />
        </div>
        <Card title="Check-ins today" subtitle="Per hour">
          {hasToday ? (
            <div className="h-52"><ResponsiveContainer>
              <AreaChart data={live.dailyLine}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" /><XAxis dataKey="hour" stroke="#88888880" fontSize={10} interval={2} /><YAxis stroke="#88888880" fontSize={11} allowDecimals={false} width={24} /><Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="v" name="Check-ins" stroke={brand.primaryColor} fill={brand.primaryColor} fillOpacity={0.2} strokeWidth={2} /></AreaChart>
            </ResponsiveContainer></div>
          ) : <div className="text-sm text-foreground/40 py-8 text-center">No check-ins yet today.</div>}
        </Card>
      </div>
    </PortalShell>
  )
}
