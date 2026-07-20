# Deploying GymOS to Production

GymOS is configured specifically to run safely optimized inside standard serverless/edge pipelines like Vercel. 

### Why Vercel?
1. **Next.js `<Image/>` Edge Optimization**: We rely strictly on `images.unsplash.com`, `i.pravatar.cc`, and `images.pexels.com`. Vercel natively intercept these routes and compiles them using WebP/AVIF algorithms at edge cache layers instantly.
2. **Server Actions (RPC)**: `next/headers` cookies and mutating session caches operate seamlessly over Edge function invocations.

## Deployment Step-by-Step

### Option 1: Vercel CLI (Recommended)
1. Install the CLI: `npm i -g vercel`
2. Authenticate: `vercel login`
3. Execute link: `vercel link`
4. Push environment bounds: `vercel env pull .env.local`
5. Map bounds to deployment: `vercel env push .env.local`
6. Deploy: `vercel --prod`

### Production Safeguards You Must Know:
- **Middleware Enforcer (`middleware.js`)**: Be extremely careful routing new endpoints. The Edge middleware natively asserts `Secure` and `HttpOnly` boundaries strictly across `/super-admin`, `/dashboard`, `/trainer`, and `/portal` blocking unauthenticated user states!
- **Bundle Limits**: We explicitly export `mock-db` files on the sever layer only (`export const PLATFORM_STATS = gymsData.length`). Modifying these limits to a `client` context will result in a 5.2 Megabyte hydration payload breaking TTFB/LCP metrics on load!
