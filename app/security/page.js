import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Activity } from 'lucide-react'

export const metadata = {
    title: 'Security | GymOS',
}

export default function Security() {
    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-foreground/50 hover:text-foreground mb-12 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                </Link>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Platform Security</h1>
                <p className="text-lg text-foreground/70 mb-10">We treat your data with the highest level of security. Here&apos;s a transparent breakdown of how GymOS protects your facility.</p>

                <div className="grid gap-6">
                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 shadow-sm">
                        <Shield className="h-8 w-8 text-emerald-500 mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-3">Enterprise-Grade Infrastructure</h2>
                        <p className="text-foreground/70 leading-relaxed">GymOS is powered by Google Firebase, an enterprise cloud architecture that scales securely. Data is encrypted both in transit (TLS/SSL) and at rest.</p>
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 shadow-sm">
                        <Lock className="h-8 w-8 text-blue-500 mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-3">Role-Based Access Control (RBAC)</h2>
                        <p className="text-foreground/70 leading-relaxed">We enforce strict permission boundaries at the database level. Members can only see their own workouts, trainers can only manage their assigned clients, and owners maintain absolute control over the entire system.</p>
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-8 shadow-sm">
                        <Activity className="h-8 w-8 text-red-500 mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-3">Secure Authentication</h2>
                        <p className="text-foreground/70 leading-relaxed">We use robust session management and enforce strict login flows. We never store plaintext passwords, and all authentication tokens are securely handled and verified on the server edge.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
