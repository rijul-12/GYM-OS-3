import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Privacy Policy | GymOS',
}

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-foreground/50 hover:text-foreground mb-12 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                </Link>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Privacy Policy</h1>
                <div className="space-y-6 text-foreground/80 leading-relaxed text-lg">
                    <p>At GymOS, your privacy is our priority. We are committed to protecting the data of gym owners, their staff, and their members.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">What Data We Collect</h2>
                    <p>We collect essential operational data (such as member names, attendance logs, and workout plans) needed to run your facility. For billing, we use secure third-party processors like Razorpay and do not store sensitive payment details on our servers.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">How We Use Your Data</h2>
                    <p>Your data is used strictly to power the GymOS platform. It enables live traffic predictions, personalized member experiences, and automated check-ins.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Data Ownership</h2>
                    <p>You own your gym&apos;s data. We do not sell your data or your members&apos; data to third-party advertisers or data brokers. Ever.</p>
                    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4">Contact Us</h2>
                    <p>If you have any questions regarding your privacy or data, please write to us at <strong className="text-foreground">rijul0027@gmail.com</strong>.</p>
                </div>
            </div>
        </div>
    )
}
