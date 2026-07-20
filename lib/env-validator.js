/**
 * Validates rigid production environment mappings before permitting hydration.
 * Crashing early prevents undefined edge errors mid-execution.
 */
export function validateEnvironment() {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    // Optional overrides
    const warnings = [
        'SUPABASE_SERVICE_ROLE_KEY'
    ]

    let isHealthy = true;

    required.forEach((key) => {
        if (!process.env[key]) {
            console.error(`[FATAL] Missing strictly required environment variable: ${key}`)
            isHealthy = false
        }
    })

    // Prevent start if missing critically scoped ENV variables
    if (!isHealthy) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Production Boot Halted: Invalid environment scope variables detected.')
        } else {
            console.warn('⚠️ Booting in DEV with missing ENVs. Supabase features will rely exclusively on Demo Fallback mode.')
        }
    }

    warnings.forEach((key) => {
        if (!process.env[key]) {
            console.warn(`[WARN] Missing background-privileged environment variable: ${key}. Webhooks & Admin overrides disabled.`)
        }
    })

    return true;
}
