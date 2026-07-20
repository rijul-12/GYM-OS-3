'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBrand } from '@/components/brand-provider'
import { Logo } from '@/components/logo'

function App() {
  const { brand } = useBrand()
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="absolute top-8 left-8"><Link href="/"><Logo size="lg" /></Link></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="h-20 w-20 mx-auto rounded-2xl flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}22, transparent 60%)`, border: `1px solid ${brand.primaryColor}44` }}>
          <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full blur-3xl opacity-40" style={{ background: brand.primaryColor }} />
          <Clock className="h-9 w-9 relative" style={{ color: brand.primaryColor }} />
        </motion.div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-6">Session expired</h1>
        <p className="text-sm text-foreground/50 mt-2 leading-relaxed">For your security we’ve signed you out after inactivity. Sign back in to pick up where you left off.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/login"><Button style={{ background: brand.primaryColor }} className="h-11 px-6 text-foreground border-0">Sign in again <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
          <Link href="/"><Button variant="outline" className="h-11 px-6 bg-foreground/[0.03] border-foreground/10">Back to website</Button></Link>
        </div>
      </motion.div>
    </div>
  )
}

export default App
