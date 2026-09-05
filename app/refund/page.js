import { Logo } from '@/components/logo'
import Link from 'next/link'
import { ArrowLeft, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-20 px-6">
            <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-12">
                    <Logo size="lg" />
                    <Link href="/">
                        <Button variant="outline" className="h-10 px-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Button>
                    </Link>
                </div>

                <div className="space-y-4">
                    <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
                        <RefreshCcw className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Refund Policy</h1>
                    <p className="text-foreground/60 text-lg">Clear, transparent, and fair returns.</p>
                </div>

                <div className="space-y-8 text-foreground/80 leading-relaxed font-medium">
                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">14-Day Guarantee</h2>
                        <p className="text-sm">If you subscribe as a Gym Owner and are not satisfied with BGM within the first 14 days, you may request a full refund, no questions asked.</p>
                    </section>

                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">Member Refunds</h2>
                        <p className="text-sm">BGM does NOT process refunds for gym memberships directly. If you are a facility member requesting a refund for your local gym fees, you must contact your gym's administration.</p>
                    </section>

                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">Canceling Subscriptions</h2>
                        <p className="text-sm">You can cancel your BGM software subscription at any time. Your services will continue until the end of your current billing cycle.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
