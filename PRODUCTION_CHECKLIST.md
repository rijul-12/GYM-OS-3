# GymOS Production Readiness Checklist

Before transitioning GymOS domains publicly onto Vercel and executing global tenant outreach, owners MUST rigidly verify identical configurations universally.

## 1. Supabase Initialization
- [ ] Database mapped accurately (`0000_initial_schema.sql`, `0001_biometrics_settings.sql`, `0002_audit_logs.sql`)
- [ ] Row Level Security (RLS) constraints rigorously confirmed strictly enabled across EVERY table inherently blocking unauthenticated `select` leaks!
- [ ] Supabase Authentication email templates correctly matching branding URL. Defaults disabled.

## 2. Environment (Vercel Node variables)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` injected.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` injected.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` bound to Vercel encrypted Vault strictly masked avoiding standard deployment payloads inherently preventing bypass.

## 3. Operations
- [ ] Ensure generic Service Role access is fully removed from frontend client builds.
- [ ] Super Admin credentials manually generated securely. (Verify default `demo@gymos.app` disabled).
- [ ] Custom Domain SSL bindings provisioned internally via Vercel correctly.

## 4. Hardware Verification
- [ ] Firewall limits accepting Vercel static IP pools if executing Biometric bounds locally on restricted Intranet TCP proxies natively.
- [ ] Biometric Secret key globally confirmed encrypted natively in Settings.
