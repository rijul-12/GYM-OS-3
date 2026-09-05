export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-6 py-32 text-foreground/80 leading-relaxed font-sans">
                <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-4 py-1.5 text-xs tracking-widest text-[#ef4444] uppercase mb-8">Statutory Compliance</div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight mb-4">Privacy Policy</h1>
                <p className="text-sm text-foreground/50 mb-16">Last Updated: October 2026</p>

                <div className="space-y-12">
                    <section>
                        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Information Collection</h2>
                        <p>BGM Technologies restricts the collection of personal information strictly to what is necessary for operating your BGM SaaS platform. This includes basic identity variables required for Firebase Authentication and the intelligent health matrices opted-in by facility members.</p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. Data Security & Storage</h2>
                        <p>All biometric and structural infrastructure data is encrypted at rest and in transit via Firebase and Google Cloud architectures. BGM Technologies unconditionally guarantees that it never sells, exposes, or brokers live gym telemetry to third-party ad networks.</p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. Contact Us</h2>
                        <p>For urgent privacy or DPO concerns, contact us globally at: <strong>rijul0027@gmail.com</strong>.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
