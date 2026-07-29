import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Terms of Service | GymOS',
}

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-foreground/50 hover:text-foreground mb-12 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                </Link>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
                <div className="space-y-6 text-foreground/80 leading-relaxed text-lg">
                    <p>Welcome to GymOS. These terms outline the rules and responsibilities when using our platform to run your fitness facility.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Account Responsibilities</h2>
                    <p>As a gym owner, you are responsible for maintaining the confidentiality of your account credentials. You agree to ensure that any staff members granted access use the platform responsibly and lawfully.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Acceptable Use</h2>
                    <p>GymOS is designed to operate gyms. You agree not to reverse engineer the platform, attempt unauthorized access to other gyms&apos; data, or use our services for any illegal activities.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Subscription & Cancellation</h2>
                    <p>GymOS is a subscription service. You may cancel at any time through the Super Admin panel. Upon cancellation, your access will remain active until the end of the current billing cycle, after which your account will be downgraded.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Updates to Terms</h2>
                    <p>We may update these terms occasionally as we release new features. We will always notify you of any significant changes via the platform or email.</p>
                </div>
            </div>
        </div>
    )
}
