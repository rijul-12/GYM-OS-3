'use client'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ErrorBoundary({ error, reset }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full p-6 text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 max-w-md w-full backdrop-blur-xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-5">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground mb-2">System Interruption</h2>
                <p className="text-sm text-foreground/50 mb-6">A critical exception occurred while attempting to render this node. The system caught it safely.</p>

                <div className="bg-black/40 rounded-lg p-3 text-left mb-6 overflow-hidden">
                    <code className="text-[10px] text-red-400 font-mono break-words">{error.message || 'Unknown render exception'}</code>
                </div>

                <button onClick={() => reset()} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-white/5 hover:bg-white/10 text-foreground font-medium transition border border-foreground/10">
                    <RefreshCw className="h-4 w-4" /> Attempt Recovery
                </button>
            </motion.div>
        </div>
    )
}
