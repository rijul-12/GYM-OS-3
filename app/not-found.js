'use client'
import Link from 'next/link'
import { FileQuestion, ArrowRight } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center">
            <div className="relative mb-8">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 border border-foreground/10 shadow-2xl relative z-10">
                    <FileQuestion className="h-10 w-10 text-foreground/40" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 blur-[80px] rounded-full z-0" />
            </div>

            <h2 className="font-display text-4xl font-bold tracking-tight mb-3">Void Sector</h2>
            <p className="text-foreground/50 mb-8 max-w-sm mx-auto">
                The requested resource path does not exist on this server. It may have been relocated or you might lack authorization limits.
            </p>

            <div className="flex items-center gap-4">
                <button onClick={() => window.history.back()} className="px-6 py-2.5 rounded-xl border border-foreground/10 bg-white/5 hover:bg-white/10 transition text-sm font-medium">
                    Step back
                </button>
                <Link href="/" className="px-6 py-2.5 rounded-xl bg-white text-black hover:opacity-90 transition text-sm font-medium inline-flex items-center gap-2">
                    Return to root <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}
