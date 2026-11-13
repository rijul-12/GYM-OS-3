'use client'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { PortalShell } from '@/components/portal-shell'
import { Card, Empty } from '@/components/ui-kit'

export default function InsightsClient({ data }) {
  return (
    <PortalShell title="GymAI">
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5 text-foreground/50 shrink-0" />
          <p className="text-sm text-foreground/60">Insights calculated from your own attendance and membership records, plus anonymous check-in counts for your gym. Nothing here is estimated or made up — each card says what it is based on.</p>
        </div>

        {data.failed || !data.available ? (
          <Empty title="GymAI is unavailable right now" hint="Your data is safe. Please try again in a moment." />
        ) : (
          <>
            <Card title={`Today · ${data.today.weekday}`}>
              <div className="text-sm">{data.today.planned.length ? `Planned: ${data.today.planned.join(' + ')}` : 'No workout planned for today.'}</div>
              <div className="text-xs text-foreground/50 mt-1">{data.today.insideNow} member{data.today.insideNow === 1 ? '' : 's'} in the gym right now{data.today.capacity ? ` (capacity ${data.today.capacity})` : ''}.</div>
            </Card>
            {data.insights.length === 0 ? <Empty title="Not enough data yet" hint="Check in a few times and your insights will appear here." /> : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {data.insights.map(i => {
                  const body = (
                    <div className={`h-full rounded-2xl border p-4 ${i.tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : 'border-foreground/10 bg-foreground/[0.02]'}`}>
                      <div className="font-medium">{i.title}</div>
                      <div className="text-sm text-foreground/60 mt-1">{i.detail}</div>
                      <div className="text-[11px] text-foreground/40 mt-3">Based on: {i.basis}</div>
                    </div>
                  )
                  return <li key={i.id}>{i.href ? <Link href={i.href} className="block h-full">{body}</Link> : body}</li>
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </PortalShell>
  )
}
