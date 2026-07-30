import { Logo } from '@/components/logo'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
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
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Privacy Policy</h1>
                    <p className="text-foreground/60 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-8 text-foreground/80 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">1. Information We Collect</h2>
                        <p>We collect basic information required to provide you with the GymOS service. This includes your name, email, phone number, and any fitness details you explicitly provide during registration, such as goals and workout schedules.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">2. How We Use Your Data</h2>
                        <p>Your data is strictly used to run the gym management features, such as QR Check-ins, Live Traffic Predictions, and Workout Tracking. Gym Owners use this to optimize the facility experience for you.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">3. Data Sharing</h2>
                        <p>We do not sell your personal data to anyone. Your profile information is only shared securely with the specific Gym you registered under. We utilize industry-standard cloud security providers to store your information.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-3">4. Your Rights</h2>
                        <p>At any time, you can reach out to your Gym Administrator or GymOS Support to view, modify, or permanently delete the personal data associated with your account.</p>
                    </section>

                    <section>
                        <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/10 text-center mt-12">
                            <h3 className="font-bold mb-2">Questions about your privacy?</h3>
                            <p className="text-sm text-foreground/60">Contact us at <a href="mailto:rijul0027@gmail.com" className="text-emerald-500 hover:underline">rijul0027@gmail.com</a></p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
