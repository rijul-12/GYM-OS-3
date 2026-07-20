# GymOS Vercel Deployment Guide

GymOS has been fundamentally configured using Next.js 14 App Router and Edge Middleware, making it a perfect target for Vercel deployment inherently caching React Server Components dynamically for extremely responsive P99 loads.

## 1. Prerequisites
- Vercel CLI (`npm i -g vercel`) or continuous integration linking via GitHub repository.
- Supabase Project (`Database -> API`) retaining the `URL`, `Anon_KEY`, and `Service_Role`.

## 2. Environment Configurations
Your Vercel project MUST be supplied following variables to pass the new `lib/env-validator.js` boundary constraints enforcing stable connectivity:

| Key | Value Origin | Importance |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API | **Critical:** Frontend boot bound |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API | **Critical:** Identity session bound |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API | **High:** Required for Webhooks & Admin endpoints |

## 3. Database Execution 
Prior to first compile, deploy definitions resolving tables globally across tenants securely via RLS:
1. `npm run migrations:apply` using Supabase CLI deploying `0000_initial_schema.sql`, `0001_biometrics_settings.sql`, and `0002_audit_logs.sql`.

## 4. Build Architecture Optimization 
The production Next.js compiler is optimized seamlessly for Server actions. However, ensure `package.json` bypasses node boundary restrictions when compiling Edge runtime wrappers:
```bash
npm run build 
```
GymOS achieves Exit code `0` cleanly natively without warnings against hydration errors!

## 5. Security Note:
Super Admin commands globally inherently bind dynamically into `service_role` constraints meaning Vercel function deployments must securely mask `SUPABASE_SERVICE_ROLE_KEY` directly inside Vercel Dashboard secrets. Never expose this locally.
