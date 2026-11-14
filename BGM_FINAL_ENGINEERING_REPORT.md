# BGM — Final Engineering Report

Branch: `claude/bgm-production-readiness-kzs130` (5 commits on top of `a1caf95`). Nothing was deployed and `main` was not touched.

## Read this first

1. **The code is ready for a staging deployment, not yet for production.** Everything was verified against the Firebase emulators with a production build. Nothing could be verified against your real Firebase project, live Razorpay, real e-mail or Twilio — no credentials were available in this environment.
2. **The branch is pushed** to `origin/claude/bgm-production-readiness-kzs130`. No pull request has been opened and nothing is merged.
3. **Two things need your attention before anything else** (details in §15):
   * check Firebase Authentication for the accounts `superadmin@gymos.com` and `owner@gymos.com`. Scripts in the old repository created them with the passwords `admin123` / `123456`. If they exist, change the passwords or delete them.
   * every signed-in user will have to sign in again after deployment (the session format changed).
4. **Behaviour that changes for your users** — decided by me where the brief required it; say if you want any reverted:
   * people who self-register as members are now **Pending** until the owner reviews and approves them (previously active immediately on a "Basic" plan);
   * members whose membership has expired can no longer check in;
   * the UPI ID is shown to members only when the owner enables UPI *and* enters an ID.

## 1. Architecture summary

Next.js 15 App Router on Vercel; Firebase Auth, Firestore and Storage; Razorpay; Resend/SMTP e-mail; Twilio SMS. All data access is server-side through Server Actions that verify a signed Firebase session cookie on every call; the browser uses Firebase for sign-in only. Full description: `BGM_ARCHITECTURE.md`.

## 2. Bugs discovered

71 issues: 14 critical, 27 high, 21 medium, 9 low. Each is listed with file, root cause, affected role and status in `BGM_COMPLETE_AUDIT.md`.

The audit changed the picture of the project: the main problem was not a set of isolated bugs but that **the server trusted the browser for everything**. Any visitor could act as any role for any gym.

## 3. Bugs fixed

63 of 71. The 8 that remain open are listed in §15.

## 4. Features repaired

| Area | Result |
|---|---|
| Sign-in, sign-out, session persistence, role redirects | Rebuilt on verified session cookies. Sign-out runs Firebase `signOut` and clears the server session |
| Authorisation and gym isolation | Enforced in every server action and route. Suspending a gym or removing/suspending a trainer takes effect on the next request |
| Profile photo upload (all four roles) | One shared uploader and one server pipeline; replace and remove supported |
| Gym registration | Creates gym, settings, trial subscription, owner profile and unique code atomically; rolls back on failure; duplicates rejected |
| Member creation | Full record with review step, several muscle groups per day, "No Fixed Schedule", optional trainer, server-computed dues, invitation e-mail |
| Member self-registration | Links to the owner-created record when one exists; otherwise Pending for owner review |
| Membership management | Create, edit, renew (dues carried forward), suspend, cancel, reactivate, record payment; one source of truth for status |
| QR attendance | Validates gym, membership and current QR code; transactional, duplicate-proof check-in |
| Live traffic and workout demand | Unique occupancy; demand per configured facility; stale sessions excluded; no invented intensity or calories |
| Complete Session | Confirmation, checkout timestamp, in-place update, idempotent |
| Razorpay | Server-side amounts, signature + API confirmation, idempotent webhook for both flows, failed payments and refunds |
| Owner UPI | Independent toggles, optional and validated UPI ID, visibility switch, owner-only confirmation |
| Bring Your Data | CSV/XLSX, column detection, manual mapping, preview, validation, duplicate detection, plan and trainer mapping, batch id, history, error report |
| User deletion | UID-based, paginated, idempotent, with an explicit retention policy; self-service deletion for all roles except Super Admin |
| E-mail | One provider layer, official-domain links, honest "not configured" reporting |
| SMS | Owner-only, honest accepted/rejected reporting, cool-down |
| Notifications | Real unread counts, per-user read state, mark all read, gym and role isolation |
| GymAI | Insights computed from the member's own records; each states what it is based on |
| Analytics | Every figure computed from stored records in the gym's timezone |
| Super Admin | Gyms, owners, subscriptions, analytics, audit log, feedback, announcements, system health, data cleaning, pricing |
| Mobile | One responsive shell; no horizontal overflow at 320–430 px or 768 px |
| Branding | Customer-facing text is BGM / Best Gym Manager |

## 5. Features still incomplete

| Feature | State | Severity |
|---|---|---|
| Member → gym online payments reaching the gym's bank | Money is collected into BGM's Razorpay account. There is no Razorpay Route / linked-account transfer to the gym. Works technically; **settlement is a business decision** | HIGH |
| Firebase Auth deletion trigger | Function source is in `firebase/functions`; the receiving endpoint is tested. Not deployed | HIGH |
| Rate limiting on registration and password reset | Not implemented (needs an external store or Firebase App Check) | HIGH |
| GymAI | Rule-based insights only; no language model is connected, and none was present in the original code | MEDIUM |
| Biometric / turnstile hardware | Authenticated endpoints exist; not tested against a physical device | MEDIUM |
| Real-time updates | Live views refresh every 15–30 s by polling, not by push | LOW |
| Manual subscription requests | Super Admin can approve/reject them, but no owner screen creates them (and none did before) | LOW |
| Invoice PDF download | Removed (the button had no implementation) | LOW |

## 6. Root causes of the critical bugs

1. **Unsigned session cookie.** The session was JSON written by the server and trusted on the way back. Fix: Firebase session cookies verified with the Admin SDK.
2. **No authorisation in server actions.** The Admin SDK bypasses security rules, and actions accepted ids from the client. Fix: a session layer (`lib/server/session.js`) used by every action, plus gym-scoped document loading.
3. **Sign-in ran on the server with the client SDK.** One auth singleton shared by all requests; the browser never held a Firebase session. Fix: sign in in the browser, exchange the ID token.
4. **Unauthenticated maintenance routes and a default webhook secret** were left in the deployed app. Fix: removed; secrets are mandatory.
5. **Payment parameters came from the browser** (gym, plan, amount, member), and the subscription checkout sent a plan id the server rejected. Fix: everything derived from server-side orders and balances.
6. **Profile photos**: undefined `user.id`, download URLs without a token, and WebP export failing on iPhones. Fix: session identity, tokenised URLs, JPEG compression.
7. **Several inconsistent schemas for the same thing** (member identity by e-mail vs. uid, three payment ledgers, two schedule fields, status fields that were never written). Fix: one canonical field each, with readers that still understand legacy data.

## 7. Files modified

843 files changed, about 16,600 lines added and 28,300 removed. Most of the removals are the committed build output and one-off scripts.

* **Removed**: `app/.next/**`, `.next-backup-*`, 20 database wipe/cleanup scripts under `app/`, root scripts with hard-coded passwords, deploy logs, `supabase/`, mock data, `app/api/{clean123,test,seed,equipments,[[...path]]}`, `app/api/webhooks/biometrics`, `app/api/attendance/bridge`, mock libraries, the Super Admin gym-creation wizard, 15 outdated documents.
* **New server core**: `lib/server/*` (10 modules), `lib/domain/*` (6 modules).
* **Rewritten**: every file in `actions/`, `middleware.js`, `lib/auth.js`, `lib/email.js`, `lib/firebase/*`, the four shells (now one `components/app-shell.jsx`), and the page + client component of almost every route.
* **Patched in place** (working code kept): `app/checkin/[gymCode]`, `app/checkout/[gymCode]`, `app/register`, `app/login`, `components/widget-builder.jsx`, `components/notifications-dropdown.jsx`, `components/off-peak-sms-modal.jsx`, `components/feedback.jsx`.
* **New**: `firestore.rules` (rewritten), `storage.rules`, `firestore.indexes.json`, `firebase.json`, `firebase/functions/`, `.env.example`, `tests/`, `vercel.json` cron schedule.

`git diff --stat a1caf95` gives the exact list.

## 8. Database / schema changes

No destructive migration is needed; existing documents keep working because readers accept the legacy field names.

| Change | Effect on existing data |
|---|---|
| `members.authUid` is the link between a login and a member | Self-registered members (document id = uid) resolve directly. A member with a login but no `authUid` is linked on first sign-in by gym + e-mail |
| Canonical `members.schedule` + `noFixedSchedule` | `weeklySchedule` is still read |
| Member status derived from `status` + `expiryDate` | Members with a past expiry date now show as **Expired** and cannot check in |
| `member_transactions` is the only member payment ledger | Old rows in `revenue` / `revenue_logs` are no longer read. Revenue figures start from confirmed payments in `member_transactions` |
| `users/{uid}` owner profile | Created at registration from now on; created on demand for existing owners (photo upload) |
| `gym_subscriptions.registrationFeePaid` | Unset for existing gyms → **the one-time registration fee is added to their next payment.** Set it to `true` for gyms that already paid |
| New: `import_batches`, `platform_announcements`, `gym_api_settings.secret_hash` | Additive |
| `notifications.readBy`, `targetUid`, `targetMemberId` | Old notifications addressed only by e-mail still display |
| Trainers created by the old owner flow (no login) | Shown as they are; use "Resend invite" so the trainer can create a login |

**Rollback**: redeploy the previous Vercel build. Documents written by the new code contain extra fields the old code ignores. Do not roll back the Firestore rules without also rolling back the app.

## 9. Security changes

* Verified, httpOnly, signed session cookies; role and gym from signed claims only.
* Authorisation and gym isolation in every action and route; input whitelisting and validation.
* Firestore and Storage rules deny all direct client access.
* Removed unauthenticated destructive and data-dumping routes; removed demo logins.
* Mandatory secrets for the deletion webhook and cron; constant-time comparisons.
* Hardware endpoints require a per-gym key (stored hashed, shown once).
* Trainer invitations are single-use hashed tokens; the link itself changes nothing.
* Razorpay: signature check, API confirmation of order/amount/capture, idempotency, amounts never from the client.
* Uploads: type, magic-byte and size validation; uid-based paths.
* Security headers; CORS wildcard and framing removed; open redirect closed.
* Audit log for sensitive actions.

## 10. Environment variables required

See `.env.example`. Super Admin → System Health shows which are missing on a running deployment (names only).

| Variable | Needed for | Without it |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | Sign-in | Nobody can sign in |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | All data access | App reports "server not configured" |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Profile photos | Upload reports the missing variable |
| `APP_URL` | Links in e-mails | Defaults to `https://gymos.app` in production |
| `RESEND_API_KEY` **or** `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS`; `EMAIL_FROM` | All e-mail incl. password reset and invitations | E-mails are not sent; the UI says so |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Checkout | Payment buttons report "not configured" |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook | Webhook returns 500 |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER` | Off-peak SMS | Feature lists the missing variables |
| `CRON_SECRET` | Daily reminders, auto check-out, subscription expiry | Cron endpoint refuses to run |
| `FIREBASE_WEBHOOK_SECRET` | Auth-deletion cleanup | Endpoint disabled |

## 11. Razorpay configuration status

**Code complete, not verified live.** Verified with signed test events against the emulator: both flows, retries, amount mismatch, failed payments, refunds. Not verified: a real checkout, capture and settlement.

To do in the Razorpay dashboard: set the three variables; add the webhook `https://gymos.app/api/webhooks/razorpay` with `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`; run one test-mode payment for each flow. Decide how member payments are settled to gyms (§5).

## 12. E-mail / SMS configuration status

**E-mail** — provider layer supports Resend or SMTP. Not verified live. Flows: welcome (owner, trainer, member), member invitation, trainer invitation, password reset, e-mail verification, subscription receipt, subscription/trial reminders, membership-expiry reminders, UPI results (in-app). All links use `https://gymos.app`. `support@gymos.app` is used as the contact address throughout (it replaced a personal Gmail address on public pages) — **make sure that mailbox exists.**

**SMS** — the provider in the repository is **Twilio** (REST API). The earlier "missing API key" error was simply the three Twilio variables not being set; the feature now names exactly which are missing. Not verified live. For Indian numbers, SMS must come from a **DLT-registered** sender with an approved template; until your Twilio account has that, operators will reject or drop the messages, and the app will report the provider's rejection.

## 13. Tests executed

| Suite | Result |
|---|---|
| Unit tests (`npm run test:unit`) — membership status, dues, schedules, occupancy vs. demand, timezone dates, phone parsing, import validation | 17 / 17 pass |
| End-to-end, real browser, production build, Firebase emulators (`tests/e2e/run.mjs`) | 33 / 33 pass, 0 browser console errors |
| Trainer and session revocation (`tests/e2e/trainer.mjs`) | 20 / 20 pass |
| Razorpay webhook (`tests/e2e/webhook.mjs`) | 11 / 11 pass |
| Responsive audit (`tests/e2e/responsive.mjs`) — every route of all four portals and the public pages at 320, 360, 375, 390, 393, 414, 430 and 768 px | 446 checks, 0 problems: no horizontal overflow, sign-out reachable in the menu at every width, no page errors |
| ESLint | Clean |

Explicitly covered by the end-to-end suite: forged session cookie rejected; duplicate gym and duplicate member rejected; nothing written before confirmation (member, import); expired and pending members cannot check in; repeated check-in does not duplicate; occupancy 1 with Chest 1 / Shoulders 1 / Legs 0; Complete Session without reload and idempotent; UPI stays pending until the owner confirms; partial dues arithmetic; photo upload, replace and persistence for member and owner; QR regeneration invalidates the old code; gym and role isolation; deletion with ledger retention; idempotent deletion webhook; Super Admin protected.

**Not tested**: real Firebase project and deployed rules/indexes; live Razorpay, e-mail, Twilio; physical QR scanning with a phone camera (the URL the QR encodes was tested); physical biometric devices; Safari/iOS specifically (Chromium was used); load or concurrency beyond a double submit; Super Admin and trainer photo upload through the UI (same component and server path as owner/member).

## 14. Build result

`next build` succeeds (Next.js 15.5.16), 65 routes. `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` remain enabled in `next.config.js` as before; lint is clean when run directly.

## 15. Remaining blockers

**CRITICAL**
1. **Review and merge.** The branch is on GitHub but not reviewed or merged; open a pull request when you are ready.
2. **Weak-password accounts.** Check for `superadmin@gymos.com` and `owner@gymos.com` in Firebase Authentication and secure or delete them.
3. **Confirm a Super Admin account exists with the `role: super_admin` custom claim** and a strong password. The app no longer contains any way to create one (by design); it is set once with the Admin SDK or Firebase console tooling.

**HIGH**
4. Deploy Firestore rules, indexes and Storage rules (`firebase deploy --only firestore:rules,firestore:indexes,storage`). Until then the old permissive rules stay active. Check first that nothing else you run reads Firestore from a client.
5. Set the environment variables in Vercel (§10), including the new `CRON_SECRET` and `FIREBASE_WEBHOOK_SECRET`.
6. Deploy the Auth-deletion Cloud Function (requires the Firebase Blaze plan).
7. Verify Razorpay end to end in test mode; decide member-payment settlement.
8. Set `registrationFeePaid: true` on `gym_subscriptions` for gyms that already paid the registration fee.
9. Add rate limiting / App Check for registration and password reset.

**MEDIUM**
10. Verify e-mail delivery and that `support@gymos.app` exists; complete DLT registration before using SMS in India.
11. Have the privacy, terms and refund pages reviewed; I rewrote them to be factually accurate about what the software does, but they are not legal advice.
12. Test on real iPhones and Android phones, including scanning the printed QR code.
13. Legacy data check on a copy of production: members without `expiryDate`, trainers without logins, old payment rows.

**LOW**
14. `xlsx@0.18.5` has known advisories (it only parses the owner's own file in their browser); consider replacing it.
15. Build-time lint/type checks are still switched off in `next.config.js`.
16. Polling instead of push for live views.

## 16. Recommended next steps

1. Open a pull request for the branch and review it.
2. Create a **staging** Firebase project and Vercel preview with the variables from §10; deploy rules and indexes there; run the end-to-end suites' flows by hand on real phones.
3. Run one Razorpay test-mode payment for each flow and confirm the webhook.
4. Take a Firestore export of production, then deploy to production in this order: environment variables → app → Firestore/Storage rules and indexes → Cloud Function → Razorpay webhook.
5. After deployment, open Super Admin → System Health and clear every red item.

## Acceptance criteria

"Verified" means proven by an automated test in this environment (emulators). "Needs live check" means the code is complete but depends on a service that could not be reached here.

| Criterion | Status |
|---|---|
| Super Admin works | Verified (gyms list, access control); other pages exercised by the responsive audit only |
| Owner Portal works | Verified |
| Trainer Portal works | Verified |
| Member Portal works | Verified |
| Authentication works | Verified |
| Authorization works | Verified |
| Profile photo upload works | Verified (member, owner); same path for trainer and Super Admin |
| Gym registration works | Verified |
| Member registration works | Verified |
| Membership management works | Partly verified (create, approve, expiry, payment); renew/suspend/cancel implemented, not covered by automated tests |
| QR attendance works | Verified, except physical camera scan |
| Attendance synchronization works | Verified (15–30 s polling) |
| Live occupancy is correct | Verified |
| Workout demand is correct | Verified |
| Session completion works | Verified |
| Razorpay works | Needs live check |
| Optional UPI works correctly | Verified |
| Payment verification works | Verified with signed test events; needs live check |
| CSV/XLSX import works | CSV verified end to end; XLSX parsing implemented, not covered by an automated test |
| User deletion works safely | Verified; trigger deployment pending |
| Email links work | Link construction verified by code path; delivery needs live check |
| SMS configuration is verified | Provider identified and requirements documented; needs live check |
| Notifications work | Verified |
| GymAI works with authorized data | Implemented (rule-based); member-only data scope by construction, no dedicated test |
| Analytics are accurate | Core calculations unit-tested; page rendering exercised, figures not cross-checked on real data |
| Mobile experience works | Verified for layout in Chromium; real devices pending |
| Desktop experience works | Verified |
| Security rules are correct | Written; deployment and verification pending |
| Customer-facing branding is BGM | Verified by search |
| No critical console errors | Verified |
| No broken routes | Verified |
| No dead buttons | Removed where found; not exhaustively proven |
| No fake/demo functionality | Removed where found |
| Production build succeeds | Verified |
| Critical workflows pass testing | Verified on emulators |
