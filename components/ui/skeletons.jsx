'use client'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 animate-pulse">
            <div className="h-4 w-1/3 bg-white/10 rounded mb-4" />
            <div className="h-8 w-1/2 bg-white/10 rounded mb-2" />
            <div className="h-3 w-1/4 bg-white/5 rounded" />
        </div>
    )
}

export function ListSkeleton({ count = 5 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="h-10 w-10 bg-white/10 rounded-full shrink-0" />
                        <div className="space-y-2 w-full">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-3 w-24 bg-white/5 rounded" />
                        </div>
                    </div>
                    <div className="h-8 w-24 bg-white/10 rounded mt-4 sm:mt-0" />
                </div>
            ))}
        </div>
    )
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
    return (
        <div className="w-full overflow-hidden rounded-xl border border-white/5 animate-pulse">
            <div className="grid border-b border-white/5 bg-white/[0.02] p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="h-4 bg-white/10 rounded w-2/3" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={(i + 1) * 100} className="grid border-b border-white/5 border-dashed p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                    {Array.from({ length: columns }).map((_, j) => (
                        <div key={j} className="h-3 bg-white/5 rounded w-3/4" />
                    ))}
                </div>
            ))}
        </div>
    )
}

export function DataErrorState({ error, retry }) {
    return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
                <h3 className="text-red-500 font-semibold mb-1">Failed to load data</h3>
                <p className="text-sm text-red-400/80 mb-4 max-w-sm">{error?.message || 'An unexpected database error occurred.'}</p>

                {retry && (
                    <Button onClick={retry} className="bg-red-500 text-white hover:bg-red-600 transition-colors">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try again
                    </Button>
                )}
            </div>
        </div>
    )
}
