# BGM — Architecture

BGM (Best Gym Manager) is a multi-tenant gym management SaaS. This document describes the system as it exists on the branch `claude/bgm-production-readiness-kzs130`.

## 1. Existing architecture

| Layer | Technology | Notes |
|---|---|---|
| Web app | Next.js 15 (App Router), React 18, JavaScript (no TypeScript sources) | Tailwind + Radix UI primitives, Recharts |
| Server logic | Next.js Server Actions (`actions/`) and Route Handlers (`app/api/`) | There is no separate backend service |
| Database | Cloud Firestore, accessed **only** through the Firebase Admin SDK on the server | |
| Auth | Firebase Authentication (e-mail + password) with custom claims `role` and `gymCode` | |
| Files | Firebase Storage (profile photos), written by the server | |
| Payments | Razorpay (orders, checkout, webhook) | Two separate flows, see §7 |
| E-mail | Resend or SMTP (nodemailer), whichever is configured | |
| SMS | Twilio REST API | |
| Hosting | Vercel (`output: 'standalone'`), daily Vercel Cron | Production domain https://gymos.app |

Key design rule: **the browser never talks to Firestore or Storage.** The Firebase client SDK is used for sign-in only. Every read and write goes through a Server Action or Route Handler that first verifies the session. Firestore and Storage security rules therefore deny all direct client access.

There are no Cloud Functions in the running system. One function source is provided (`firebase/functions`) for the Auth `onDelete` trigger; it must be deployed separately (see §11).

## 2. Frontend structure

```
app/
  page.js, landing-client.js        public landing page
  login, register, forgot-password, reset-password, verify-email, onboarding
  privacy, terms, refund, security  public policy pages
  checkin/[gymCode]                 QR landing page (member check-in)
  checkout/[gymCode]                Complete Session by link
  dashboard, members, trainers, plans, occupancy, attendance-logs, analytics,
  equipments, attendance-integrations, branding, settings, help,
  dashboard/{import,payments,subscription}      OWNER portal
  trainer/…                         TRAINER portal   (layout enforces role)
  portal/…                          MEMBER portal    (layout enforces role)
  super-admin/…                     SUPER ADMIN portal (layout enforces role)
components/
  app-shell.jsx                     one responsive shell used by all four portals
  dash-shell / trainer-shell / portal-shell / superadmin-shell   nav definitions
  photo-uploader.jsx                the single profile-photo control (all roles)
  add-member-modal.jsx              add member / review-and-approve member
  schedule-editor.jsx               weekly schedule, several muscle groups per day
  session-card.jsx                  active session + Complete Session
  zone-demand.jsx                   occupancy card and workout-demand grid
  brand-provider.jsx                gym branding/settings loaded from the server
  notifications-dropdown.jsx, feedback.jsx, global-search.jsx, ui-kit.jsx, ui/*
lib/auth.js                         client auth context (UI summary of the session)
```

Each page is a Server Component (`page.js`) that authorises the request, loads data and renders a Client Component. State management is React state plus `router.refresh()`; live views re-fetch on a timer while the tab is visible (`components/use-live-refresh.js`).

## 3. Backend structure

```
lib/server/            server-only helpers (NOT callable from the browser)
  session.js           verify session cookie, role guards, gym-scoped document loader, audit()
  subscription.js      gym → BGM subscription state, idempotent payment application
  payments.js          Razorpay client, signature checks, capture confirmation, ledger application
  live.js              open sessions, occupancy, demand, hourly/daily attendance
  members.js           member validation, shaping, duplicate index, invite tokens
  gym-settings.js      whitelist/validation of owner-editable settings, per-role views
  deletion.js          footprint deletion + retention policy
  hardware.js          device authentication and punch recording
  notify.js, pricing.js
lib/domain/            pure logic, unit tested (no Firebase)
  membership.js        single source of truth for membership status and dues
  schedule.js          schedule normalisation
  occupancy.js         occupancy vs. workout demand
  dates.js, phone.js   timezone-aware dates, flexible date parsing, phone normalisation
  import.js            column detection and row validation for imports
actions/               Server Actions (the public server API; every one authorises first)
  auth.js, payments.js, sms.js
  db/{gyms,members,trainers,trainer_operations,plans,attendance,occupancy,analytics,
      member_payments,subscriptions,pricing,notifications,import,registration,onboarding,
      settings,storage,activity,account,insights,reconciliation,superadmin,public}.js
app/api/
  webhooks/razorpay          Razorpay webhook (both payment flows)
  webhooks/firebase-auth     called by the Auth onDelete function
  cron/subscriptions         daily job (Vercel Cron)
  attendance/punch           hardware punch endpoint (per-gym secret)
  attendance/adms/iclock/cdata   ZKTeco/eSSL ADMS push (per-gym secret)
  invite/trainer             redirect-only landing for trainer invitation links
```

## 4. Firestore collections

`gymId` is the gym document id. It is assigned at registration (format `GYM-ABC-1234`) and never changes; it is also the value of the `gymCode` custom claim.

| Collection | Key | Purpose / important fields |
|---|---|---|
| `gyms` | gymId | `gymName`, `ownerUid`, `email`, `status` (Active/Pending/Suspended), **`gymCode`** (current QR/join code — equals gymId until regenerated), `qrLastResetDate` |
| `gym_settings` | gymId | branding, `timezone`, `currency`, `buildingCapacity`, `widgets` (facilities), `upi_enabled`, `upi_id`, `upi_show_to_members`, `razorpay_enabled`, `att_auto_checkout`, `att_timeout`, `onboarded`, `equipment` |
| `gym_subscriptions` | gymId | `status` (Trial/Active/Expired/Pending_Payment/Cancelled), `trialEndDate`, `subscriptionExpiryDate`, `plan`, `registrationFeePaid` |
| `gym_api_settings` | gymId | hardware integration `secret_hash`, `is_active`, SMS cool-down marker |
| `users` | uid | owner / super-admin profile (`role`, `gymCode`, `photoURL`) |
| `members` | auto id, or uid for self-registered | `gymId`, `authUid` (null until the member has a login), identity fields, `plan`/`planId`, `status` (stored administrative status), `startDate`, `expiryDate`, `paymentFee`, `paymentAmount`, `outstandingAmount`, `payment_status`, `trainer_id`, `noFixedSchedule`, `schedule`, `photoURL`, `activeSessionId`, `importBatchId`, `biometric_id` |
| `trainers` | auto id (invited) or uid (self-registered) | `gymId`, `uid`, `status` (Invited/Pending/Active/Suspended), `inviteTokenHash`, profile, `salary` |
| `plans` | auto id | `gymId`, `name`, `price`, `cycle`, `features` |
| `attendance` | auto id | `gymId`, `member_id`, `check_in_time`, `check_out_time` (null while open), `status`, `actual_workout[]`, `planned_workout[]`, `method`, `method_out` |
| `member_transactions` | auto id, or Razorpay order id | **member → gym ledger**: `gymId`, `memberId`, `amount`, `method`, `status` (CREATED/PENDING_VERIFICATION/PAID/REJECTED/FAILED/REFUNDED) |
| `payment_logs` | Razorpay order id | **gym → BGM** orders |
| `transactions` | Razorpay payment id | **gym → BGM** captured payments |
| `subscription_requests` | auto id | manual gym → BGM payment claims (Super Admin approves) |
| `notifications` | auto id | `gymId`, `targetRole`, optional `targetUid` / `targetMemberId`, `readBy[]` |
| `import_batches` | importBatchId | import history and per-row failures |
| `audit_logs` | auto id | sensitive actions (`action`, `gymId`, `actorUid`, `details`) |
| `gym_feedback`, `sms_logs`, `platform_settings`, `platform_announcements`, `user_settings` | | supporting data |

Composite indexes are defined in `firestore.indexes.json`. Queries that need them fall back to an unindexed scan (with a warning in the logs) so the app keeps working until the indexes are deployed.

Legacy fields from earlier versions (`weeklySchedule`, `membershipExpiry`, `is_active`, `checkIn`, `name` on gyms, …) are still read through the `lib/domain` normalisers; no data migration is required.

## 5. Roles and relationships

```
Super Admin ──manages──> Gyms (platform wide)
Owner  1───1 Gym 1───* Members
                 1───* Trainers ──assigned to──> Members (members.trainer_id)
                 1───* Plans, Attendance, Member payments, Notifications
```

* **Super Admin** — claim `role: super_admin`, no gym. Can list/approve/suspend/delete gyms, extend trials, approve manual subscription requests, read audit logs and feedback, change platform pricing. Cannot be deleted through the app.
* **Owner** — one gym. Full control of that gym only.
* **Trainer** — sees only members whose `trainer_id` is their id; never sees payment data. Removing or reassigning a trainer unassigns members, it never deletes them.
* **Member** — sees only their own profile, attendance and payments, plus anonymous gym aggregates (head-count, demand).

## 6. Authentication and authorisation flow

1. The browser signs in with the Firebase client SDK (`signInWithEmailAndPassword`).
2. It sends the fresh ID token to `createSessionAction`. The server verifies it (`verifyIdToken`, must be < 5 minutes old), checks role, gym status and trainer approval, and mints a **Firebase session cookie** (`createSessionCookie`) stored as the httpOnly cookie `gymos_session` (legacy name kept) for 24 h or 14 days ("remember me").
3. `middleware.js` only routes: it decodes the cookie's claims without verifying them to redirect between portals. It is not a security boundary.
4. Every Server Component/Action/Route calls `getSession()` → `verifySessionCookie(cookie, checkRevoked = true)`. Role and gym come from the signed claims. Client-supplied `uid`, `gymId`, `role`, amounts and statuses are never trusted.
5. Document access goes through `getGymScopedDoc(collection, id, session.gymId)`, which refuses documents of another gym.
6. Sign-out runs Firebase `signOut()` in the browser **and** clears the server cookie, then navigates to `/login`.

Password reset and e-mail verification links are generated with the Admin SDK and rewritten to `https://gymos.app/reset-password` / `/verify-email`.

Registration:
* **Owner** — creates the Auth user, then gym + settings + trial subscription + owner profile in one batch. If anything fails the Auth user is rolled back.
* **Trainer** — by owner invitation (single-use hashed token, active immediately) or by gym code (Pending until the owner approves).
* **Member** — by gym code. If the owner already created/imported a member with that e-mail the login is **linked** to that record; otherwise a `Pending` member is created for the owner to review and approve.

## 7. Payment flows (kept strictly separate)

**A. Gym pays BGM** — `actions/payments.js` → `createRazorpayOrder` / `verifyPaymentSignature`
`payment_logs/{orderId}` → Razorpay Checkout → server verifies the signature **and** fetches the payment from Razorpay (order id, amount, captured) → `applyGymSubscriptionPayment` (transaction keyed by payment id) → `transactions/{paymentId}` + `gym_subscriptions` extended. Amount and the one-time registration fee are computed on the server.

**B. Member pays their gym** — single ledger `member_transactions`
* *Recorded by owner* (cash/card/bank): `recordMemberPayment`, `markPaymentPaid`, opening payment on create/renew.
* *Direct UPI*: member sees the gym's UPI ID only if the owner enabled and exposed it → `submitDirectUpiPayment` creates a `PENDING_VERIFICATION` row; dues do not change. Only the owner's `resolveUpiPayment` can mark it `PAID`.
* *Razorpay*: order amount = server-side outstanding balance; verified exactly like flow A; `applyMemberPayment` reduces dues transactionally.

**Webhook** `/api/webhooks/razorpay` verifies the HMAC signature and handles `payment.captured` / `order.paid`, `payment.failed`, `refund.processed` / `payment.refunded` for both flows. It is idempotent, so webhook retries and the checkout callback racing the webhook are safe.

## 8. Attendance flow

1. Owner prints the gym QR (Settings → QR & Attendance). It encodes `https://gymos.app/checkin/{gymCode}`.
2. Member scans with the phone camera → `/checkin/[gymCode]`. If not signed in they are sent to login and returned.
3. `getAttendancePreCheck` validates: current gym code, member belongs to that gym, gym active, **membership effectively active** (stored status + expiry date in the gym's timezone), no live session already. It returns today's planned workout and the selectable groups (standard six + the gym's facilities).
4. Member confirms or changes the workout → `markQrAttendance`. A Firestore transaction reads the member document and open sessions, so double taps and retries cannot create a second session.
5. Owner dashboard and Live Traffic show the session on their next refresh (15–20 s).
6. **Complete Session** (`completeMySession`) sets `check_out_time`, `status: Completed`. It is idempotent.
7. Sessions left open longer than the gym's limit (default 4 h) are auto-closed and never count towards occupancy.

**Occupancy** = number of unique members with a live session. **Demand** = per facility, how many of those members chose that muscle group. Demand is never summed into occupancy; a percentage is shown only when the owner set a capacity for the zone.

Regenerating the QR writes a new `gyms.gymCode`; the old code stops resolving immediately.

## 9. Notification flow

`lib/server/notify.js` writes to `notifications`. Readers (`actions/db/notifications.js`) filter by gym, role and, for personal notifications, uid/member id. Read state is per user (`readBy`). The bell polls every 30 s while the tab is visible. Sources: registrations, approvals, payments to verify, payment results, trainer assignment, schedule changes, membership expiry (cron), subscription expiry (cron), Super Admin announcements.

## 10. External integrations

| Integration | Where | Configuration |
|---|---|---|
| Firebase Auth/Firestore/Storage | `lib/firebase/*` | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Razorpay | `lib/server/payments.js` | `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| E-mail | `lib/email.js` | `RESEND_API_KEY` **or** `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`; `EMAIL_FROM` |
| SMS (Twilio) | `actions/sms.js` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER` |
| Attendance hardware | `app/api/attendance/*` | per-gym key generated by the owner |

When a provider is not configured the feature reports exactly which variables are missing; nothing pretends to succeed. Super Admin → System Health lists the status of each.

## 11. Production deployment

* **Vercel** builds `next build` and serves the app at https://gymos.app. `vercel.json` schedules `/api/cron/subscriptions` daily (needs `CRON_SECRET`).
* **Firebase** (manual, not done by Vercel):
  * `firebase deploy --only firestore:rules,firestore:indexes,storage`
  * `firebase deploy --only functions` (Auth onDelete → `/api/webhooks/firebase-auth`, needs `FIREBASE_WEBHOOK_SECRET` on Vercel and `BGM_WEBHOOK_SECRET` as a function secret)
* **Razorpay dashboard**: webhook URL `https://gymos.app/api/webhooks/razorpay`, events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.
* Customer-facing links always use `APP_URL` or, in production, `https://gymos.app`; Vercel preview hostnames are never used in e-mails.

## 12. Testing

* `npm run test:unit` — domain logic (membership, schedule, occupancy/demand, dates, phone, import).
* `tests/e2e/run.mjs` — 33 end-to-end flows in a real browser against the Firebase emulators.
* `tests/e2e/responsive.mjs` — layout audit at 320–430 px and 768 px for every portal route.
