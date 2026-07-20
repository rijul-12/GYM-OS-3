'use client'

export default function Loading() {
    return (
        <div className="flex h-full min-h-[400px] w-full items-center justify-center">
            <div className="flex gap-2">
                <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    )
}
