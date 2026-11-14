# BGM — Best Gym Manager

*Your gym runs. BGM handles the rest.*

Gym management SaaS for gym owners, trainers and members: memberships, QR attendance, live gym traffic and workout demand, trainers, payments (Razorpay and owner-verified UPI), member import, notifications and analytics.

Production: https://gymos.app

## Stack

Next.js 15 (App Router) · React 18 · Firebase Authentication · Cloud Firestore · Firebase Storage · Razorpay · Vercel.

All data access happens on the server through authorised Server Actions using the Firebase Admin SDK. The browser uses Firebase for sign-in only.

## Documentation

| File | Contents |
|---|---|
| `BGM_ARCHITECTURE.md` | How the system is built: structure, collections, auth, payments, attendance, deployment |
| `BGM_COMPLETE_AUDIT.md` | Every issue found in the audit, with root cause, severity and status |
| `BGM_FINAL_ENGINEERING_REPORT.md` | What was changed, how it was tested, what is still open and what you need to do |

## Running locally

```bash
npm ci
cp .env.example .env.local   # fill in your Firebase project values
npm run dev
```

## Tests

```bash
npm run test:unit            # domain logic, no services needed
```

End-to-end tests run a real browser against the Firebase emulators (never a real project):

```bash
# terminal 1 (needs firebase-tools and Java)
firebase emulators:start --only auth,firestore,storage --project demo-bgm

# terminal 2
set -a; . tests/e2e/emulator.env; set +a
npx next build && npx next start -p 3100

# terminal 3
set -a; . tests/e2e/emulator.env; set +a
node tests/e2e/run.mjs          # 33 core flows
node tests/e2e/trainer.mjs      # trainer invitation, isolation, removal, session revocation
node tests/e2e/webhook.mjs      # Razorpay webhook: both flows, idempotency, refunds
node tests/e2e/responsive.mjs   # every portal route at 320–430 px and 768 px
```

## Deployment

Vercel builds and serves the app. Firebase rules, indexes and the Auth-deletion function are deployed separately:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

See `BGM_FINAL_ENGINEERING_REPORT.md` for the full launch checklist and the environment variables (`.env.example`).
