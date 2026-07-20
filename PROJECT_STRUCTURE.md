# GymOS Project Architecture
The codebase strictly adheres to the Next.js 14+ / App Router specification.

## Core Directories
### `/actions`
All backend mutations and database connections. Next.js natively invokes these using the `'use server'` RPC layer which allows for completely isolated database mutations and Edge network cookie sets.

### `/app`
Next.js 14 routing layer.
- `/super-admin`: Enforced RBAC level 4. Root operations.
- `/dashboard`: Enforced RBAC level 3. Gym owner aggregations.
- `/trainer`: Enforced RBAC level 2. Client deployment mappings.
- `/portal`: Enforced RBAC level 1. Member workout state.
- `error.js` & `global-error.js`: Critical SSR fault interceptors isolating crashed server-trees from the live DOM viewport.
- `loading.js`: Application-wide Suspense boundary for layout jitter mitigation.

### `/components`
Re-usable atomic boundaries.
- `/ui`: Granular building blocks (`stat-card.jsx`, Shadcn primitives).
- `*-shell.jsx`: The foundational layout boundaries that execute SSR-safe client viewport handling and mobile touch constraints.

### `/lib`
Client-side context aggregators and Demo Mode synthesis mappings.
- `auth.js`: The React `useContext` wrapper providing global member state without drilling.

### `/scripts`
The Demo Mode procedural engine that algorithmically dictates JSON limits mapped heavily against local memory to mock massive production databases.
