import { Logo } from '@/components/logo'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Security() {
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
                    <div className="h-16 w-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
                        <Shield className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Security Standards</h1>
                    <p className="text-foreground/60 text-lg">How we keep your facility and member data strictly safe.</p>
                </div>

                <div className="space-y-8 text-foreground/80 leading-relaxed font-medium">
                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">Data Encryption</h2>
                        <p className="text-sm">All traffic between the GymOS application and our databases uses secure HTTPS encryption. Your data at rest is protected by world-class Google Firebase encryption protocols.</p>
                    </section>

                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">Role-Based Access Control</h2>
                        <p className="text-sm">We strictly enforce permissions so that Members can only see their own information, Trainers can only see assigned clients, and Owners have total but secure command over their workspace.</p>
                    </section>

                    <section className="p-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
                        <h2 className="text-xl font-bold text-foreground mb-2">Dynamic QR Logic</h2>
                        <p className="text-sm">GymOS Check-in QR codes are dynamic and securely validated in real-time, preventing screenshot-sharing or fraudulent buddy check-ins.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
