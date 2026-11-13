import Link from 'next/link'

/** Shared layout for the public policy pages. */
export function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-20">
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">← BGM — Best Gym Manager</Link>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-6">{title}</h1>
        {updated && <p className="text-sm text-foreground/50 mt-2">Last updated: {updated}</p>}
        <div className="mt-10 space-y-8 text-foreground/80 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">{children}</div>
        <p className="mt-12 text-sm text-foreground/50">Questions? <a className="underline" href="mailto:support@gymos.app">support@gymos.app</a></p>
      </div>
    </div>
  )
}
