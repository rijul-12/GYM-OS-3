# GymOS
The all-in-one multi-tenant management software built specifically to engineer scaling gym chains.

## Project Vision
GymOS radically consolidates the fragmented software stack of commercial gym chains (attendance hardware, member mobile apps, trainer portals, and executive analytics) into a single unified cloud operating system mapped for performance and speed.

## Core Features
1. **Multi-Tenant Administration (`/super-admin`)**: Control revenue metrics, hardware limits, gym subscriptions, and AI-driven growth metrics globally.
2. **Owner Analytics (`/dashboard`)**: Granular real-time access monitoring, subscription churn projections, and live occupancy heatmaps.
3. **Trainer Hub (`/trainer`)**: Active client deployments, workout periodization graphs, and member progression charting.
4. **Member Portal (`/portal`)**: Secure booking endpoints, hardware integration tracking, and diet mapping.

## The Architecture
- **Framework**: Next.js 15+ (App Router)
- **UI & State**: React Server Components, Client Suspense, Context Providers
- **Design Engine**: Vanilla CSS + Tailwind Shims + Lucide Icons
- **Animation Layer**: Framer Motion
- **Data Rendering**: Recharts
- **Offline / Caching**: Next.js Server Actions + Service Worker (PWA Ready) 

## Documentation
- `INSTALL.md`: Setting up GymOS on your local dev machine.
- `DEPLOYMENT.md`: Infrastructure guidelines for Vercel/Netlify hosting.
- `PROJECT_STRUCTURE.md`: Map of the Next.js directories and data paths. 
