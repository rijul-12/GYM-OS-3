# GymOS Firebase Migration Plan

This document outlines the strategic architectural shift required to migrate GymOS natively from **Supabase (PostgreSQL)** to **Firebase (NoSQL)**. 

No active code has been modified during the generation of this proposal.

## 1. Authentication Strategy
**Current:** Supabase Auth mapping JWTs transparently via Next.js middleware and Supabase SSR Server Clients.
**Firebase Target:** 
* Migrate to **Firebase Auth**.
* Since GymOS relies heavily on Next.js 14 App Router and Edge Middleware, we must utilize `next-firebase-auth-edge` (or the Firebase Admin SDK heavily bound over server tokens) to correctly verify identity via JWT cookie decryption natively within Next.js Server Components.
* **Tokens:** Users authenticate client-side, the token triggers an API boundary to bake an `httpOnly` secure session cookie.

## 2. Firestore Collections (NoSQL Schema Design)
**Current:** Rigid relational tables (`gyms`, `members`, `attendance`, `gym_api_settings`) with strict foreign key constraints.
**Firebase Target:** Data must be denormalized for optimized shallow reads avoiding complex joins.

*   **`/gyms/{gymId}`**: Core gym profiles and settings (merging `gym_api_settings` natively into sub-objects).
*   **`/members/{memberId}`**: Flat member profiles. Instead of relying purely on Postgres joins to pull trainer data, we will duplicate `trainer_name` safely.
*   **`/attendance/{gymId}/logs/{logId}`**: Sub-collections natively restrict queries bounding perfectly to the tenant's gym domain without complex filtering.

## 3. Storage Architecture
**Current:** Uninitialized local blobs or missing remote cloud maps.
**Firebase Target:** **Firebase Cloud Storage**.
* A bucket (`gs://gymos-XYZ.appspot.com/gyms/{gymId}/photos/{memberId}.jpg`) will house biometric mapping imagery and profile avatars, structurally mirroring the `gymId` domain to effortlessly apply security rules.

## 4. Role-Based Access Control (RBAC)
**Current:** Postgres Row Level Security (RLS) policies defining `where gym_id = auth.uid()`.
**Firebase Target:** **Firebase Custom Claims**.
* At authentication, GymOS will utilize the Firebase Admin SDK to execute `admin.auth().setCustomUserClaims(uid, { role: 'owner', gymId: '123' })`.
* This inherently embeds global scope safely directly inside the lightweight ID token, bypassing the need to constantly fetch role limits from the Database wrapper mappings.

## 5. Security Rules 
**Current:** SQL Policies masking selections.
**Firebase Target:** **Firestore Security Rules**.
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Owners can mutate their tenant tree solely
    match /gyms/{gymId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.token.gymId == gymId;
    }
    // Super Admins override via distinct scope
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.role == 'superadmin';
    }
  }
}
```

## 6. Environment Variables (Vercel Boundary)
To execute this framework natively on our production pipeline, the following bounds must replace our `NEXT_PUBLIC_SUPABASE_URL`:

| Key | Utility |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public client boot key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Target identity host. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project router mapping. |
| `FIREBASE_CLIENT_EMAIL` | Service Account restricted email (Admin SDK). |
| `FIREBASE_PRIVATE_KEY` | Service Account encrypted masking (Admin SDK). |

## 7. Migration Order
If authorized, execution MUST follow this strict sequence enforcing minimal downtime:
1. **Infrastructure:** Boot Firebase Project and structure `.env.local` bindings.
2. **Authentication:** Port Context UI and Edge Middleware substituting Supabase JWT parsing for Firebase token resolution. 
3. **Data Access Layers (DAL):** Refactor `actions/db/` to initialize `firebase-admin` natively bypassing `createClient()` SQL wrappers.
4. **Security Rules:** Upload standard `firestore.rules` verifying boundary testing globally.
5. **Clean up:** Purge `@supabase/supabase-js` entirely.
