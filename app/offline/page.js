'use client'
import { WifiOff, Search } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <WifiOff className="h-10 w-10 text-foreground/40" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">No Internet Connection</h1>
            <p className="text-foreground/50 max-w-md mx-auto mb-8">
                BGM requires an active data connection to synchronize live member attendance and billing metrics. Please check your network and try again.
            </p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition">
                Retry Connection
            </button>
        </div>
    )
}
