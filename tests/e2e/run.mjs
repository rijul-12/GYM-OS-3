// End-to-end checks against the Firebase emulators.
//
//   1. firebase emulators:start --only auth,firestore,storage --project demo-bgm
//   2. (set -a; . tests/e2e/emulator.env; set +a; npx next dev --port 3100)
//   3. (set -a; . tests/e2e/emulator.env; set +a; node tests/e2e/run.mjs)
//
// Drives the real UI with Playwright and verifies the resulting state in
// Firestore through the Admin SDK. Never point this at a production project.
import { createRequire } from 'node:module'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import fs from 'node:fs'
import path from 'node:path'

// Playwright may be installed globally (CI images) or locally.
const { chromium } = createRequire(import.meta.url)('playwright')

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to run: emulator environment variables are not set.'); process.exit(2)
}
const BASE = process.env.APP_URL || 'http://localhost:3100'
const SHOTS = process.env.E2E_SHOTS || ''
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
const db = getFirestore()
const auth = getAuth()

const run = Date.now().toString(36)
const OWNER = { email: `owner.${run}@example.com`, password: 'Passw0rd!owner', name: 'Olive Owner', gym: `Iron ${run}` }
const OWNER2 = { email: `owner2.${run}@example.com`, password: 'Passw0rd!owner2', name: 'Other Owner', gym: `Rival ${run}` }
const MEMBER = { email: `member.${run}@example.com`, password: 'Passw0rd!member', name: 'Maya Member', phone: '9876500001' }
const SELF = { email: `self.${run}@example.com`, password: 'Passw0rd!self', name: 'Sam Selfreg', phone: '9876500002' }
const ADMIN = { email: `admin.${run}@example.com`, password: 'Passw0rd!admin' }

const ROLE_TAGLINE = { owner: 'Full command center', trainer: 'Coach view', member: 'Your gym, in your pocket' }
const results = []
let failed = 0
async function step(name, fn) {
  const t = Date.now()
  try { await fn(); results.push(`PASS  ${name} (${Date.now() - t}ms)`); console.log(`PASS  ${name}`) }
  catch (e) { failed++; results.push(`FAIL  ${name} — ${e.message.split('\n')[0]}`); console.log(`FAIL  ${name}\n      ${e.message.split('\n').slice(0, 4).join('\n      ')}`) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }

const browser = await chromium.launch()
const consoleErrors = []
async function newSession(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  page.setDefaultNavigationTimeout(90000) // dev server compiles routes on first visit
  page.on('pageerror', e => consoleErrors.push(`${page.url()} :: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::/i.test(m.text())) consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 200)}`) })
  return { ctx, page }
}
// Navigate and wait until the page has hydrated and settled, so interactions are not lost.
async function go(page, url) {
  await page.goto(url)
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { })
}
async function login(page, role, creds, expectPath) {
  await go(page, `${BASE}/login`)
  await page.getByRole('button', { name: new RegExp(ROLE_TAGLINE[role]) }).click()
  await page.locator('input[type="email"]').fill(creds.email)
  await page.locator('input[type="password"]').fill(creds.password)
  await page.getByRole('button', { name: /^Sign in/ }).click()
  if (expectPath) await page.waitForURL(u => new URL(u).pathname.startsWith(expectPath), { timeout: 60000 })
}
async function registerOwner(page, o) {
  await go(page, `${BASE}/register?role=owner`)
  await page.locator('input[name="gymName"]').fill(o.gym)
  await page.locator('input[name="ownerName"]').fill(o.name)
  await page.locator('input[name="email"]').fill(o.email)
  await page.locator('input[name="phone"]').first().fill('9876543210')
  await page.locator('input[name="city"]').fill('Pune')
  const country = page.locator('input[name="country"]'); if (await country.count()) await country.fill('India')
  await page.locator('input[name="password"]').fill(o.password)
  await page.locator('input[name="confirmPassword"]').fill(o.password)
  await page.locator('button[type="submit"]').click()
  await page.getByText('Your gym is ready').waitFor({ timeout: 60000 })
}
const pickGold = async (dlg) => { const sel = dlg.locator('select[name="member-plan"]'); const label = (await sel.locator('option').allInnerTexts()).find(t => t.startsWith('Gold')); await sel.selectOption({ label }) }
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false }) } }
const gymOf = async (email) => (await db.collection('gyms').where('email', '==', email).limit(1).get()).docs[0]
const memberByEmail = async (email) => (await db.collection('members').where('email', '==', email).limit(1).get()).docs[0]

let gymId, gymCode, memberId
const owner = await newSession()

// ------------------------------------------------------------------ registration & auth
await step('Owner registration creates gym, settings, trial subscription, owner profile and unique code', async () => {
  await registerOwner(owner.page, OWNER)
  const gym = await gymOf(OWNER.email)
  assert(gym, 'gym document missing')
  gymId = gym.id; gymCode = gym.data().gymCode
  assert(/^GYM-[A-Z]{3}-\d{4}$/.test(gymCode), `unexpected gym code ${gymCode}`)
  assert((await db.collection('gym_settings').doc(gymId).get()).exists, 'gym_settings missing')
  const sub = await db.collection('gym_subscriptions').doc(gymId).get()
  eq(sub.data()?.status, 'Trial', 'subscription status')
  const user = await auth.getUserByEmail(OWNER.email)
  eq(user.customClaims.role, 'owner', 'role claim'); eq(user.customClaims.gymCode, gymId, 'gym claim')
  assert((await db.collection('users').doc(user.uid).get()).exists, 'owner profile missing')
})

await step('Duplicate owner registration is rejected and creates no second gym', async () => {
  const s = await newSession()
  await go(s.page, `${BASE}/register?role=owner`)
  await s.page.locator('input[name="gymName"]').fill('Dup Gym'); await s.page.locator('input[name="ownerName"]').fill('Dup')
  await s.page.locator('input[name="email"]').fill(OWNER.email); await s.page.locator('input[name="phone"]').first().fill('9876543210')
  await s.page.locator('input[name="city"]').fill('Pune')
  const country = s.page.locator('input[name="country"]'); if (await country.count()) await country.fill('India')
  await s.page.locator('input[name="password"]').fill(OWNER.password); await s.page.locator('input[name="confirmPassword"]').fill(OWNER.password)
  await s.page.locator('button[type="submit"]').click()
  await s.page.getByText(/already registered|already exists/i).waitFor({ timeout: 30000 })
  eq((await db.collection('gyms').where('email', '==', OWNER.email).get()).size, 1, 'gym count for owner')
  await s.ctx.close()
})

await step('Wrong password is rejected; wrong role tab is rejected', async () => {
  const s = await newSession()
  await login(s.page, 'owner', { email: OWNER.email, password: 'wrong-password' })
  await s.page.getByText(/Invalid e-mail or password/i).waitFor({ timeout: 30000 })
  await login(s.page, 'member', OWNER)
  await s.page.getByText(/different role/i).waitFor({ timeout: 30000 })
  eq((await s.ctx.cookies()).filter(c => c.name === 'gymos_session').length, 0, 'session cookie after failed login')
  await s.ctx.close()
})

await step('Owner login → onboarding → dashboard; session cookie is httpOnly signed JWT', async () => {
  await login(owner.page, 'owner', OWNER, '/onboarding')
  await owner.page.getByRole('button', { name: 'Continue' }).click()
  await owner.page.getByRole('button', { name: 'Continue' }).click()
  await owner.page.locator('[data-testid=\"finish-onboarding\"]:visible').first().click()
  await owner.page.waitForURL(/\/dashboard$/, { timeout: 60000 })
  await owner.page.getByText('Total members').waitFor()
  const c = (await owner.ctx.cookies()).find(x => x.name === 'gymos_session')
  assert(c && c.httpOnly, 'cookie must be httpOnly'); eq(c.value.split('.').length, 3, 'cookie JWT segments')
  await shot(owner.page, 'owner-dashboard')
})

await step('Session persists across reload', async () => {
  await owner.page.reload(); await owner.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { })
  await owner.page.getByText('Total members').waitFor({ timeout: 30000 })
  assert(owner.page.url().endsWith('/dashboard'), 'not on dashboard after reload')
})

// ------------------------------------------------------------------ plans, members
await step('Owner creates a membership plan', async () => {
  await go(owner.page, `${BASE}/plans`)
  await owner.page.getByRole('button', { name: /New plan/ }).click()
  const dlg = owner.page.getByRole('dialog')
  await dlg.locator('input').nth(0).fill('Gold'); await dlg.locator('input[type="number"]').fill('3000')
  await dlg.getByRole('button', { name: 'Save plan' }).click()
  await owner.page.getByText('Plan created').waitFor()
  eq((await db.collection('plans').where('gymId', '==', gymId).where('name', '==', 'Gold').get()).size, 1, 'Gold plan count')
})

await step('Owner adds a member (review step, multi-muscle schedule, partial payment) — dues computed server-side', async () => {
  await go(owner.page, `${BASE}/members`)
  await owner.page.locator('[data-testid="add-member"]:visible').first().click()
  const dlg = owner.page.getByRole('dialog')
  await dlg.locator('input[name="member-name"]').fill(MEMBER.name)
  await dlg.locator('input[name="member-phone"]').fill(MEMBER.phone)
  await dlg.locator('input[name="member-email"]').fill(MEMBER.email)
  await dlg.getByRole('button', { name: 'Continue' }).click()
  await pickGold(dlg)
  await dlg.locator('input[name="member-paid"]').fill('1000')
  eq((await dlg.locator('[data-testid=\"member-outstanding\"]:visible').first().innerText()).replace(/[^\d]/g, ''), '2000', 'outstanding preview')
  await dlg.getByRole('button', { name: 'Continue' }).click()
  await dlg.locator('[data-testid=\"no-fixed-schedule\"]:visible').first().uncheck()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
  const dayBox = dlg.locator('div.rounded-xl', { hasText: today }).last()
  await dayBox.getByRole('button', { name: 'Chest' }).click(); await dayBox.getByRole('button', { name: 'Shoulders' }).click()
  await dlg.getByRole('button', { name: 'Continue' }).click()
  const review = await dlg.locator('[data-testid=\"member-review\"]:visible').first().innerText()
  assert(review.includes(MEMBER.name) && review.includes('Gold') && review.includes('Chest + Shoulders'), 'review step must show the full record')
  eq((await memberByEmail(MEMBER.email)), undefined, 'nothing may be written before confirmation')
  await dlg.locator('[data-testid=\"member-submit\"]:visible').first().click()
  await owner.page.getByText(new RegExp(`${MEMBER.name} added`)).waitFor({ timeout: 30000 })
  const m = await memberByEmail(MEMBER.email); memberId = m.id
  const d = m.data()
  eq(d.gymId, gymId, 'member gym'); eq(d.status, 'Active', 'status'); eq(d.outstandingAmount, 2000, 'outstanding'); eq(d.payment_status, 'Partial', 'payment status')
  eq(d.phone, '+919876500001', 'normalised phone'); eq(JSON.stringify(d.schedule[today]), '["Chest","Shoulders"]', 'schedule')
  const tx = await db.collection('member_transactions').where('memberId', '==', memberId).get()
  eq(tx.size, 1, 'ledger rows'); eq(tx.docs[0].data().amount, 1000, 'ledger amount'); eq(tx.docs[0].data().status, 'PAID', 'ledger status')
})

await step('Duplicate member (same phone) is rejected', async () => {
  await owner.page.locator('[data-testid="add-member"]:visible').first().click()
  const dlg = owner.page.getByRole('dialog')
  await dlg.locator('input[name="member-name"]').fill('Copy Cat'); await dlg.locator('input[name="member-phone"]').fill(MEMBER.phone)
  await dlg.getByRole('button', { name: 'Continue' }).click()
  await pickGold(dlg)
  await dlg.getByRole('button', { name: 'Continue' }).click(); await dlg.getByRole('button', { name: 'Continue' }).click()
  await dlg.locator('[data-testid=\"member-submit\"]:visible').first().click()
  await dlg.getByText(/phone number already exists/i).waitFor({ timeout: 30000 })
  eq((await db.collection('members').where('gymId', '==', gymId).get()).size, 1, 'member count')
  await dlg.getByRole('button', { name: 'Close' }).click()
})

// ------------------------------------------------------------------ member account + QR attendance
const member = await newSession({ width: 390, height: 844 })
await step('Member registers with the invitation link → login is linked to the owner-created record (no duplicate)', async () => {
  await go(member.page, `${BASE}/register?role=member&gym=${gymCode}&email=${encodeURIComponent(MEMBER.email)}`)
  await member.page.locator('input[name="name"]').fill(MEMBER.name)
  await member.page.locator('input[name="phone"]').first().fill(MEMBER.phone)
  await member.page.locator('input[name="password"]').fill(MEMBER.password); await member.page.locator('input[name="confirmPassword"]').fill(MEMBER.password)
  for (const sel of await member.page.locator('select[required]').all()) { if (!(await sel.inputValue())) await sel.selectOption({ index: 1 }) }
  for (const inp of await member.page.locator('input[required]').all()) { if (!(await inp.inputValue())) await inp.fill('25') }
  await member.page.locator('button[type="submit"]').click()
  await member.page.getByText('Registration Complete').waitFor({ timeout: 60000 })
  eq((await db.collection('members').where('gymId', '==', gymId).get()).size, 1, 'member count after linking')
  const uid = (await auth.getUserByEmail(MEMBER.email)).uid
  eq((await db.collection('members').doc(memberId).get()).data().authUid, uid, 'authUid link')
})

await step('Invalid QR code is rejected; unauthenticated scan is sent to login and returns to check-in', async () => {
  await go(member.page, `${BASE}/checkin/${gymCode}`)
  await member.page.waitForURL(/\/login\?next=/, { timeout: 30000 })
  await member.page.getByRole('button', { name: new RegExp(ROLE_TAGLINE.member) }).click()
  await member.page.locator('input[type="email"]').fill(MEMBER.email); await member.page.locator('input[type="password"]').fill(MEMBER.password)
  await member.page.getByRole('button', { name: /^Sign in/ }).click()
  await member.page.waitForURL(new RegExp(`/checkin/${gymCode}`), { timeout: 60000 })
  const bad = await newSession({ width: 390, height: 844 })
  await bad.ctx.addCookies(await member.ctx.cookies())
  await go(bad.page, `${BASE}/checkin/GYM-ZZZ-0000`)
  await bad.page.getByText(/no longer valid/i).waitFor({ timeout: 30000 })
  await bad.ctx.close()
})

await step('QR check-in shows today\'s planned workout, records one session, and repeated requests do not duplicate it', async () => {
  await go(member.page, `${BASE}/checkin/${gymCode}`)
  await member.page.getByText('Chest').first().waitFor({ timeout: 30000 })
  await shot(member.page, 'member-checkin')
  await member.page.getByRole('button', { name: /check.?in|confirm/i }).first().click()
  await member.page.getByText(/checked in|you.?re in|success/i).first().waitFor({ timeout: 30000 })
  let open = await db.collection('attendance').where('member_id', '==', memberId).where('check_out_time', '==', null).get()
  eq(open.size, 1, 'open sessions after check-in')
  eq(JSON.stringify(open.docs[0].data().actual_workout), '["Chest","Shoulders"]', 'workout stored')
  // Scan again (second tab / retry on a bad network)
  await go(member.page, `${BASE}/checkin/${gymCode}`)
  await member.page.getByText(/checked in|you.?re in|success/i).first().waitFor({ timeout: 30000 })
  eq((await db.collection('attendance').where('member_id', '==', memberId).get()).size, 1, 'attendance rows after re-scan')
})

await step('Live Traffic: occupancy 1, Chest demand 1, Shoulders demand 1, Legs 0 (demand is not added to occupancy)', async () => {
  await go(owner.page, `${BASE}/occupancy`)
  eq(await owner.page.locator('[data-testid=\"inside-count\"]:visible').first().innerText(), '1', 'occupancy')
  const count = async (g) => owner.page.locator(`[data-zone="${g}"] [data-testid="zone-count"]`).innerText()
  eq(await count('Chest'), '1', 'chest demand'); eq(await count('Shoulders'), '1', 'shoulders demand'); eq(await count('Legs'), '0', 'legs demand')
  await shot(owner.page, 'owner-live-traffic')
  await go(owner.page, `${BASE}/dashboard`)
  eq(await owner.page.locator('[data-testid=\"inside-count\"]:visible').first().innerText(), '1', 'dashboard occupancy')
})

await step('Complete Session: confirmation → checkout timestamp → member portal updates without reload; duplicate completion is harmless', async () => {
  await go(member.page, `${BASE}/portal`)
  await member.page.locator('[data-testid=\"active-session\"]:visible').first().waitFor({ timeout: 30000 })
  await shot(member.page, 'member-portal-active')
  await member.page.evaluate(() => { window.__noReloadMarker = true }) // survives soft updates, lost on a real reload
  await member.page.locator('[data-testid=\"complete-session\"]:visible').first().click()
  await member.page.locator('[data-testid=\"confirm-complete\"]:visible').first().click()
  await member.page.locator('[data-testid=\"session-done\"]:visible').first().waitFor({ timeout: 30000 })
  eq(await member.page.evaluate(() => window.__noReloadMarker === true), true, 'page must not be reloaded during completion')
  const rows = await db.collection('attendance').where('member_id', '==', memberId).get()
  eq(rows.size, 1, 'attendance rows'); const a = rows.docs[0].data()
  assert(a.check_out_time && a.status === 'Completed' && a.method_out === 'Member', 'checkout not recorded')
  const firstCheckout = a.check_out_time
  await go(member.page, `${BASE}/checkout/${gymCode}`)
  await member.page.getByText(/do not have an active session/i).waitFor({ timeout: 30000 })
  eq((await rows.docs[0].ref.get()).data().check_out_time, firstCheckout, 'checkout timestamp must not change')
})

await step('After completion: owner occupancy 0 and demand 0', async () => {
  await go(owner.page, `${BASE}/occupancy`)
  eq(await owner.page.locator('[data-testid=\"inside-count\"]:visible').first().innerText(), '0', 'occupancy')
  eq(await owner.page.locator('[data-zone="Chest"] [data-testid="zone-count"]').innerText(), '0', 'chest demand')
})

await step('Expired membership cannot check in and never shows as active', async () => {
  await db.collection('members').doc(memberId).update({ expiryDate: '2020-01-01' })
  await go(member.page, `${BASE}/checkin/${gymCode}`)
  await member.page.getByText(/membership has expired/i).waitFor({ timeout: 30000 })
  await go(member.page, `${BASE}/portal`)
  await member.page.locator('[data-testid=\"membership-alert\"]:visible').first().waitFor()
  await go(owner.page, `${BASE}/members`)
  assert((await owner.page.locator(`[data-member="${MEMBER.name}"]:visible`).first().innerText()).includes('Expired'), 'owner list must show Expired')
  await db.collection('members').doc(memberId).update({ expiryDate: null })
})

// ------------------------------------------------------------------ UPI
await step('UPI: hidden until owner enables it; member claim stays PENDING_VERIFICATION and dues are unchanged', async () => {
  await go(member.page, `${BASE}/portal/billing`)
  eq(await member.page.locator('[data-testid=\"gym-upi-id\"]:visible').first().count(), 0, 'UPI must be hidden by default')
  await db.collection('gym_settings').doc(gymId).set({ upi_enabled: true, upi_id: 'irongym@okhdfcbank', upi_show_to_members: true }, { merge: true })
  await member.page.reload(); await member.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { })
  eq(await member.page.locator('[data-testid=\"gym-upi-id\"]:visible').first().inputValue(), 'irongym@okhdfcbank', 'UPI id shown')
  await member.page.locator('[data-testid=\"report-upi\"]:visible').first().click()
  await member.page.locator('[data-testid=\"upi-pending\"]:visible').first().waitFor({ timeout: 30000 })
  const tx = await db.collection('member_transactions').where('memberId', '==', memberId).where('method', '==', 'UPI').get()
  eq(tx.size, 1, 'UPI claims'); eq(tx.docs[0].data().status, 'PENDING_VERIFICATION', 'claim status')
  eq((await db.collection('members').doc(memberId).get()).data().outstandingAmount, 2000, 'dues must not change on claim')
  assert(await member.page.locator('[data-testid=\"report-upi\"]:visible').first().isDisabled(), 'second claim must be blocked')
  await shot(member.page, 'member-billing-pending')
})

await step('UPI: owner confirms → PAID, dues cleared, member notified; second confirmation impossible', async () => {
  await go(owner.page, `${BASE}/dashboard/payments`)
  await owner.page.locator('[data-testid=\"pending-upi\"]:visible').first().getByRole('button', { name: 'Confirm received' }).click()
  await owner.page.getByText(/confirmed/).first().waitFor({ timeout: 30000 })
  const tx = await db.collection('member_transactions').where('memberId', '==', memberId).where('method', '==', 'UPI').get()
  eq(tx.docs[0].data().status, 'PAID', 'claim status')
  const m = (await db.collection('members').doc(memberId).get()).data()
  eq(m.outstandingAmount, 0, 'outstanding'); eq(m.payment_status, 'Paid', 'payment status'); eq(m.paymentAmount, 3000, 'total paid')
  const n = await db.collection('notifications').where('targetMemberId', '==', memberId).get()
  assert(n.docs.some(d => d.data().title === 'Payment confirmed'), 'member notification missing')
  await go(member.page, `${BASE}/portal/billing`)
  eq((await member.page.locator('[data-testid=\"member-due\"]:visible').first().innerText()).replace(/[^\d]/g, ''), '0', 'member balance')
})

// ------------------------------------------------------------------ notifications
await step('Notifications: real unread count, mark all as read persists', async () => {
  await go(member.page, `${BASE}/portal`)
  const bell = member.page.getByRole('button', { name: /Notifications, \d+ unread/ })
  await bell.waitFor({ timeout: 30000 })
  const expected = (await db.collection('notifications').where('targetMemberId', '==', memberId).get()).size
  assert((await bell.getAttribute('aria-label')).includes(`${expected} unread`), `unread badge should be ${expected}`)
  await bell.click(); await member.page.getByRole('button', { name: 'Mark all read' }).click()
  await member.page.waitForTimeout(1500); await member.page.reload(); await member.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { })
  await member.page.getByRole('button', { name: 'Notifications', exact: true }).waitFor({ timeout: 30000 })
})

// ------------------------------------------------------------------ profile photo (all roles share one pipeline)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAS0lEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNn/rbrgFcGNAY0BjQGNAY0BjQGNAY0BjQGNAY0BjQGNAY0BjQGNAY0BjQGtAtqyQJ+VvS8RAAAAABJRU5ErkJggg==', 'base64')
async function uploadPhoto(s, url, label) {
  await go(s.page, `${BASE}${url}`)
  await s.page.locator('[data-testid="photo-input"]').last().setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG })
  await s.page.getByText('Profile photo updated').waitFor({ timeout: 30000 })
  const src = await s.page.locator('img[alt$="photo"]:visible').first().getAttribute('src')
  assert(src && src.includes('/profilePhotos/') || src.includes('profilePhotos%2F'), `${label}: avatar src not updated (${src})`)
  const res = await fetch(src); eq(res.status, 200, `${label}: download URL status`)
  assert((res.headers.get('content-type') || '').startsWith('image/'), `${label}: not an image`)
  await s.page.reload(); await s.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { })
  await s.page.locator('img[alt$="photo"]:visible').first().waitFor({ timeout: 30000 })
  return src
}
await step('Profile photo — member: upload, real URL, persisted on canonical document and Auth, survives reload', async () => {
  const src = await uploadPhoto(member, '/portal/profile', 'member')
  const uid = (await auth.getUserByEmail(MEMBER.email)).uid
  eq((await db.collection('members').doc(memberId).get()).data().photoURL, src, 'members.photoURL')
  eq((await auth.getUser(uid)).photoURL, src, 'Auth photoURL')
  assert(src.includes(encodeURIComponent(`profilePhotos/${uid}/`)), 'path must be UID based')
})
await step('Profile photo — owner: upload and replace (old file removed)', async () => {
  const first = await uploadPhoto(owner, '/settings', 'owner')
  const second = await uploadPhoto(owner, '/settings', 'owner')
  assert(first !== second, 'replacement must produce a new URL')
  const uid = (await auth.getUserByEmail(OWNER.email)).uid
  eq((await db.collection('users').doc(uid).get()).data().photoURL, second, 'users.photoURL')
  assert([403, 404].includes((await fetch(first)).status), 'old photo should no longer be downloadable')
})
await step('Profile photo — non-image file is rejected', async () => {
  await go(owner.page, `${BASE}/settings`)
  await owner.page.locator('[data-testid="photo-input"]').last().setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await owner.page.getByText(/choose an image/i).waitFor({ timeout: 15000 })
})

// ------------------------------------------------------------------ QR regeneration
await step('QR regeneration requires confirmation and invalidates the previous code', async () => {
  await go(owner.page, `${BASE}/settings?tab=attendance`)
  eq(await owner.page.locator('[data-testid=\"gym-code\"]:visible').first().innerText(), gymCode, 'gym code shown')
  await owner.page.getByRole('button', { name: 'Regenerate QR' }).click()
  assert(await owner.page.locator('[data-testid=\"confirm-regenerate\"]:visible').first().isDisabled(), 'must be disabled until RESET is typed')
  await owner.page.getByRole('dialog').locator('input').fill('RESET')
  await owner.page.locator('[data-testid=\"confirm-regenerate\"]:visible').first().click()
  await owner.page.getByText(/New QR code generated/).waitFor({ timeout: 30000 })
  const fresh = (await db.collection('gyms').doc(gymId).get()).data().gymCode
  assert(fresh !== gymCode, 'code did not change')
  await go(member.page, `${BASE}/checkin/${gymCode}`)
  await member.page.getByText(/no longer valid/i).waitFor({ timeout: 30000 })
  await go(member.page, `${BASE}/checkin/${fresh}`)
  await member.page.getByText('Chest').first().waitFor({ timeout: 30000 })
  gymCode = fresh
})

// ------------------------------------------------------------------ import
await step('Bring Your Data: detect columns, preview, nothing written before confirm, import, report, importBatchId', async () => {
  const csv = ['Member Name,Mobile No,E-mail ID,Package,Date of Joining,Valid Till,Total Amount,Paid',
    'Asha Rao,9811100001,asha@example.com,Gold,01/01/2026,31/12/2027,12000,5000',
    'Bad Phone,12345,,Gold,01/01/2026,31/12/2027,1000,1000',
    `Dup Member,${MEMBER.phone},,Gold,01/01/2026,31/12/2027,1000,1000`,
    'Old Timer,9811100002,,Silver,01/01/2024,01/02/2024,1000,1000'].join('\n')
  await go(owner.page, `${BASE}/dashboard/import`)
  await owner.page.locator('[data-testid="import-file"]').last().setInputFiles({ name: 'members.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  eq(await owner.page.locator('select[data-map="name"]').inputValue(), 'Member Name', 'auto-mapped name')
  eq(await owner.page.locator('select[data-map="expiryDate"]').inputValue(), 'Valid Till', 'auto-mapped expiry')
  await owner.page.locator('[data-testid=\"import-validate\"]:visible').first().click()
  await owner.page.locator('[data-testid=\"import-preview\"]:visible').first().waitFor({ timeout: 30000 })
  const preview = await owner.page.locator('[data-testid=\"import-preview\"]:visible').first().innerText()
  assert(/Invalid phone/.test(preview) && /already belongs/.test(preview), 'validation messages missing')
  eq((await db.collection('members').where('gymId', '==', gymId).get()).size, 1, 'members before confirmation')
  await shot(owner.page, 'owner-import-preview')
  await owner.page.locator('[data-testid=\"import-confirm\"]:visible').first().click()
  await owner.page.locator('[data-testid=\"import-result\"]:visible').first().waitFor({ timeout: 60000 })
  assert((await owner.page.locator('[data-testid=\"import-result\"]:visible').first().innerText()).startsWith('2 members'), 'expected 2 imported')
  const imported = await db.collection('members').where('gymId', '==', gymId).where('sourceSystem', '==', 'import').get()
  eq(imported.size, 2, 'imported members')
  assert(imported.docs.every(d => /^IMP-/.test(d.data().importBatchId)), 'importBatchId missing')
  const asha = imported.docs.find(d => d.data().name === 'Asha Rao').data()
  eq(asha.outstandingAmount, 7000, 'imported dues'); eq(asha.expiryDate, '2027-12-31', 'imported expiry'); eq(asha.planId !== null, true, 'plan mapped')
  eq((await db.collection('import_batches').where('gymId', '==', gymId).get()).docs[0].data().errorCount, 2, 'batch error count')
  await go(owner.page, `${BASE}/members`)
  assert((await owner.page.locator('[data-member="Old Timer"]:visible').first().innerText()).includes('Expired'), 'lapsed import must show Expired')
})

// ------------------------------------------------------------------ isolation
const other = await newSession()
await step('Gym isolation: a second owner sees none of the first gym\'s members', async () => {
  await registerOwner(other.page, OWNER2)
  await login(other.page, 'owner', OWNER2, '/onboarding')
  await db.collection('gym_settings').doc((await gymOf(OWNER2.email)).id).update({ onboarded: true })
  await go(other.page, `${BASE}/members`)
  await other.page.getByText('No members yet').waitFor({ timeout: 30000 })
  assert(!(await other.page.content()).includes(MEMBER.name), 'other gym\'s member leaked')
})
await step('Role isolation: member cannot open owner or super-admin routes', async () => {
  for (const p of ['/dashboard', '/members', '/super-admin', '/trainer', '/dashboard/payments']) {
    await go(member.page, `${BASE}${p}`)
    await member.page.waitForURL(u => new URL(u).pathname.startsWith('/portal'), { timeout: 30000 })
  }
})

// ------------------------------------------------------------------ self registration + approval
const self = await newSession({ width: 390, height: 844 })
await step('Self-registered member is Pending, cannot check in, owner reviews full details and approves', async () => {
  await go(self.page, `${BASE}/register?role=member&gym=${gymCode}`)
  await self.page.locator('input[name="name"]').fill(SELF.name); await self.page.locator('input[name="email"]').fill(SELF.email)
  await self.page.locator('input[name="phone"]').first().fill(SELF.phone)
  await self.page.locator('input[name="password"]').fill(SELF.password); await self.page.locator('input[name="confirmPassword"]').fill(SELF.password)
  for (const sel of await self.page.locator('select[required]').all()) { if (!(await sel.inputValue())) await sel.selectOption({ index: 1 }) }
  for (const inp of await self.page.locator('input[required]').all()) { if (!(await inp.inputValue())) await inp.fill('25') }
  await self.page.locator('button[type="submit"]').click()
  await self.page.getByText('Registration Complete').waitFor({ timeout: 60000 })
  const doc = await memberByEmail(SELF.email)
  eq(doc.data().status, 'Pending', 'self-registered status')
  await login(self.page, 'member', SELF, '/portal')
  await go(self.page, `${BASE}/checkin/${gymCode}`)
  await self.page.getByText(/waiting for approval/i).waitFor({ timeout: 30000 })
  await go(owner.page, `${BASE}/members`)
  await owner.page.locator(`[data-member="${SELF.name}"]:visible button`).first().click()
  const dlg = owner.page.getByRole('dialog')
  await pickGold(dlg)
  await dlg.getByRole('button', { name: 'Continue' }).click(); await dlg.getByRole('button', { name: 'Continue' }).click()
  assert((await dlg.locator('[data-testid=\"member-review\"]:visible').first().innerText()).includes(SELF.name), 'review must show member')
  await dlg.locator('[data-testid=\"member-submit\"]:visible').first().click()
  await owner.page.getByText(`${SELF.name} approved`).waitFor({ timeout: 30000 })
  const after = (await doc.ref.get()).data()
  eq(after.status, 'Active', 'status after approval'); eq(after.plan, 'Gold', 'plan after approval'); eq(after.outstandingAmount, 3000, 'dues after approval')
})

// ------------------------------------------------------------------ logout
await step('Logout: Firebase sign-out + server cookie cleared; protected routes redirect; no reload hack', async () => {
  await go(member.page, `${BASE}/portal/profile`)
  await member.page.locator('[data-testid="profile-sign-out"]:visible').first().click()
  await member.page.waitForURL(/\/login/, { timeout: 30000 })
  eq((await member.ctx.cookies()).filter(c => c.name === 'gymos_session').length, 0, 'session cookie after logout')
  const fbUser = await member.page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('firebaseLocalStorageDb')
    req.onerror = () => resolve('none')
    req.onsuccess = () => { try { const tx = req.result.transaction('firebaseLocalStorage', 'readonly'); const all = tx.objectStore('firebaseLocalStorage').getAll(); all.onsuccess = () => resolve(all.result.filter(r => String(r.fbase_key).includes('authUser')).length) } catch { resolve(0) } }
  }))
  assert(fbUser === 0 || fbUser === 'none', `Firebase client user still present (${fbUser})`)
  await go(member.page, `${BASE}/portal`)
  await member.page.waitForURL(/\/login/, { timeout: 30000 })
})

// ------------------------------------------------------------------ super admin
const admin = await newSession()
await step('Super Admin: sees all gyms and platform totals; owner cannot reach super-admin', async () => {
  const u = await auth.createUser({ email: ADMIN.email, password: ADMIN.password, displayName: 'Platform Admin' })
  await auth.setCustomUserClaims(u.uid, { role: 'super_admin' })
  await login(admin.page, 'owner', ADMIN, '/super-admin')
  await go(admin.page, `${BASE}/super-admin/gyms`)
  await admin.page.getByText(OWNER.gym).first().waitFor({ timeout: 30000 })
  await admin.page.getByText(OWNER2.gym).first().waitFor()
  await shot(admin.page, 'superadmin-gyms')
  await go(owner.page, `${BASE}/super-admin`)
  await owner.page.waitForURL(/\/dashboard/, { timeout: 30000 })
})

// ------------------------------------------------------------------ API hardening
await step('API: deletion webhook, cron and Razorpay webhook reject unauthenticated calls; old debug routes are gone', async () => {
  const post = (p, body, headers = {}) => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  eq((await post('/api/webhooks/firebase-auth', { uid: 'x', secret: 'bgm_cascade_internal_secret' })).status, 401, 'deletion webhook with the old default secret')
  eq((await fetch(`${BASE}/api/cron/subscriptions`)).status, 401, 'cron without secret')
  eq((await post('/api/webhooks/razorpay', { event: 'payment.captured' }, { 'x-razorpay-signature': 'deadbeef' })).status, 400, 'razorpay webhook bad signature')
  eq((await post('/api/attendance/punch', { biometricUserId: '1' })).status, 401, 'hardware punch without key')
  for (const p of ['/api/clean123', '/api/test', '/api/seed']) eq((await fetch(`${BASE}${p}`)).status, 404, `${p} must not exist`)
})

await step('Daily cron runs with the secret', async () => {
  const res = await fetch(`${BASE}/api/cron/subscriptions`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  eq(res.status, 200, 'cron status'); assert((await res.json()).success === true, 'cron did not succeed')
})

// ------------------------------------------------------------------ deletion
await step('Deleting a member removes profile, attendance and login; payment ledger is retained anonymised; gym untouched', async () => {
  const uid = (await auth.getUserByEmail(MEMBER.email)).uid
  await go(owner.page, `${BASE}/members`)
  await owner.page.getByRole('button', { name: `Actions for ${MEMBER.name}` }).locator('visible=true').first().click()
  await owner.page.getByRole('menuitem', { name: 'Delete member' }).click()
  await owner.page.getByRole('dialog').locator('input').fill('DELETE')
  await owner.page.getByRole('dialog').getByRole('button', { name: 'Delete member' }).click()
  await owner.page.getByText('Member deleted').waitFor({ timeout: 30000 })
  eq((await db.collection('members').doc(memberId).get()).exists, false, 'member doc')
  eq((await db.collection('attendance').where('member_id', '==', memberId).get()).size, 0, 'attendance rows')
  let gone = false; try { await auth.getUser(uid) } catch { gone = true }
  assert(gone, 'auth user should be deleted')
  const tx = await db.collection('member_transactions').where('memberId', '==', memberId).get()
  assert(tx.size >= 2 && tx.docs.every(d => d.data().memberName === '[Deleted member]'), 'ledger must be retained and anonymised')
  assert((await db.collection('gyms').doc(gymId).get()).exists, 'gym must remain')
})

await step('Auth-deletion webhook (as the Cloud Function calls it) removes an owner\'s gym footprint; idempotent on retry', async () => {
  const gym2 = await gymOf(OWNER2.email)
  const uid = gym2.data().ownerUid
  const call = () => fetch(`${BASE}/api/webhooks/firebase-auth`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FIREBASE_WEBHOOK_SECRET}` }, body: JSON.stringify({ uid }) })
  await auth.deleteUser(uid)
  eq((await call()).status, 200, 'first call')
  eq((await db.collection('gyms').doc(gym2.id).get()).exists, false, 'gym doc'); eq((await db.collection('gym_settings').doc(gym2.id).get()).exists, false, 'settings doc')
  eq((await db.collection('gym_subscriptions').doc(gym2.id).get()).data().status, 'Cancelled', 'subscription retained as cancelled')
  eq((await call()).status, 200, 'retry')
  assert((await db.collection('gyms').doc(gymId).get()).exists, 'first gym must be untouched')
})

await step('Super Admin account cannot be deleted through the webhook path', async () => {
  const uid = (await auth.getUserByEmail(ADMIN.email)).uid
  const res = await fetch(`${BASE}/api/webhooks/firebase-auth`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FIREBASE_WEBHOOK_SECRET}` }, body: JSON.stringify({ uid }) })
  eq(res.status, 409, 'status'); assert(await auth.getUser(uid), 'super admin must still exist')
})

await browser.close()
console.log('\n' + results.join('\n'))
const uniqueErrors = [...new Set(consoleErrors)]
console.log(`\nBrowser console/page errors: ${uniqueErrors.length}`); uniqueErrors.slice(0, 15).forEach(e => console.log('  ' + e))
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
