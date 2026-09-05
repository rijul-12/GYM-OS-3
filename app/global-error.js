'use client'
import { ServerCrash, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }) {
    return (
        <html lang="en">
            <body className="bg-background text-foreground min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-6 border border-red-500/20">
                        <ServerCrash className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="font-display text-2xl font-bold tracking-tight mb-2">Fatal Application Crash</h1>
                    <p className="text-sm text-foreground/50 mb-8">BGM experienced a catastrophic engine failure at the root boundary level. This shouldn't normally happen.</p>
                    <button onClick={() => reset()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-6 py-3 font-medium hover:opacity-90 transition">
                        <RefreshCw className="h-4 w-4" /> Reboot Subsystem
                    </button>
                </div>
            </body>
        </html>
    )
}
