'use client'

import { useBrand } from '@/components/brand-provider';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { hasFeature } from '@/lib/plan-limits';

export function FeatureGate({ required, currentPlan = 'starter', currentPhase = 'Active', children }) {
    const { brand } = useBrand();

    // Completely unmount if the gym's trial is expired
    if (currentPhase === 'Expired') {
        return (
            <div className="relative rounded-2xl border border-foreground/10 bg-black/50 overflow-hidden w-full h-full min-h-[200px] flex items-center justify-center p-6 text-center shadow-lg backdrop-blur-sm">
                <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-md pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                        <Lock className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2">Subscription Expired</h3>
                    <p className="text-sm text-foreground/60 mb-6 max-w-sm mx-auto">
                        Your free trial or billing period has lapsed. Please renew your subscription to regain access.
                    </p>
                    <Link href="/dashboard/subscription" className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all text-white shadow-md shadow-red-500/20" style={{ background: brand?.primaryColor || '#ef4444' }}>
                        Renew Subscription
                    </Link>
                </div>
            </div>
        );
    }

    const allowed = currentPhase === 'Trial' || hasFeature(currentPlan, required);

    if (allowed) {
        return <>{children}</>;
    }

    return (
        <div className="relative rounded-2xl border border-foreground/10 bg-black/50 overflow-hidden w-full h-full min-h-[200px] flex items-center justify-center p-6 text-center shadow-lg group">
            {/* Background Blur Simulation */}
            <div className="absolute inset-0 z-0 bg-background/60 backdrop-blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: `${brand?.primaryColor || '#ef4444'}22`, border: `1px solid ${brand?.primaryColor || '#ef4444'}55` }}>
                    <Lock className="h-6 w-6" style={{ color: brand?.primaryColor || '#ef4444' }} />
                </div>

                <h3 className="font-display text-lg font-bold mb-1">Premium Feature Locked</h3>
                <p className="text-xs text-foreground/50 mb-5 max-w-[260px] mx-auto leading-relaxed">
                    This powerful module requires a higher tier plan. Upgrade to unlock its full potential.
                </p>

                <Link href="/dashboard/subscription" className="px-6 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95 hover:opacity-90 tracking-wide uppercase" style={{ background: brand?.primaryColor || '#ef4444' }}>
                    Upgrade Plan
                </Link>
            </div>
        </div>
    );
}
