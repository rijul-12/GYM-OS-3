'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, X, Zap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBrand } from '@/components/brand-provider'
import { useRouter } from 'next/navigation'

export function ComingSoonModal({ open, onOpenChange, title = "Feature Coming Soon", feature = "This feature", description = "We're currently building out this module for the next major release of BGM. Stay tuned for updates via your platform admin.", fallbackRoute }) {
    const { brand } = useBrand()
    const router = useRouter()

    const handleClose = () => {
        onOpenChange(false)
        if (fallbackRoute) router.push(fallbackRoute)
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="relative w-full max-w-md bg-card border border-foreground/10 rounded-2xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]">

                        {!fallbackRoute && (
                            <div className="absolute top-4 right-4 z-10">
                                <button onClick={handleClose} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-foreground/70 hover:text-foreground transition">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="h-32 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${brand.primaryColor} 0%, transparent 100%)` }} />
                            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="h-16 w-16 rounded-full flex items-center justify-center shadow-2xl relative z-10" style={{ background: brand.primaryColor }}>
                                <Rocket className="h-8 w-8 text-foreground" />
                            </motion.div>
                        </div>

                        <div className="p-6 pt-2 text-center">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.04] border border-foreground/10 text-xs font-semibold mb-4 text-foreground/70">
                                <Zap className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                                BGM V2 Roadmap
                            </div>

                            <h2 className="text-xl font-display font-bold mb-2">{title}</h2>
                            <div className="text-sm font-medium text-foreground mb-4 opacity-90 p-3 rounded-lg bg-foreground/[0.03] border border-foreground/5 inline-block">
                                {feature}
                            </div>
                            <p className="text-sm text-foreground/60 leading-relaxed mb-6">
                                {description}
                            </p>

                            <Button onClick={handleClose} style={{ background: brand.primaryColor }} className="w-full text-foreground border-0 h-11 hover:opacity-90">
                                {fallbackRoute ? <><ArrowLeft className="h-4 w-4 mr-2" /> Go Back</> : 'Understood'}
                            </Button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
