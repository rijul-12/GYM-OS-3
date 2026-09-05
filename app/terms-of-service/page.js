import { Logo } from '@/components/logo'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsOfService() {
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
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Terms of Service</h1>
                    <p className="text-foreground/60 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-8 text-foreground/80 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">1. Agreement to Terms</h2>
                        <p>By using BGM, you agree to these clear and simple terms. If you do not agree with them, please do not use our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">2. Acceptable Use</h2>
                        <p>You agree to use BGM solely for managing and tracking your fitness journey or facility operations. Attempting to bypass security, manipulate QR codes, or scrape platform data is strictly forbidden.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">3. Subscriptions</h2>
                        <p>Gym owners are billed on a recurring basis as outlined at checkout. If a payment fails, your operations dashboard may be temporarily suspended until the balance is paid.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">4. Limitation of Liability</h2>
                        <p>BGM provides software. We are not responsible for injuries occurring at the gym, disputes between gym members and owners, or the actual health guidance provided by trainers.</p>
                    </section>

                    <section>
                        <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/10 text-center mt-12">
                            <h3 className="font-bold mb-2">Need Help?</h3>
                            <p className="text-sm text-foreground/60">Contact us at <a href="mailto:rijul0027@gmail.com" className="text-emerald-500 hover:underline">rijul0027@gmail.com</a></p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
