// Trainer flows (emulators + running app, see run.mjs):
// invitation acceptance, assigned-members-only visibility, schedule sync to the
// member, and removal that unassigns — never deletes — members.
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
const { chromium } = createRequire(import.meta.url)('playwright')

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) { console.error('Emulator env not set.'); process.exit(2) }
const BASE = process.env.APP_URL || 'http://localhost:3100'
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
const db = getFirestore(); const auth = getAuth()
const run = Date.now().toString(36); const gymId = `GYM-TRN-${run.slice(-4).toUpperCase()}`; const PW = 'Passw0rd!trainer'
const now = new Date().toISOString()
let failed = 0
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — ' + extra}`); if (!cond) failed++ }

const owner = await auth.createUser({ email: `to.${run}@example.com`, password: PW, displayName: 'Trainer Test Owner' })
await auth.setCustomUserClaims(owner.uid, { role: 'owner', gymCode: gymId })
await db.collection('gyms').doc(gymId).set({ gymCode: gymId, gymName: 'Trainer Test Gym', ownerUid: owner.uid, email: owner.email, status: 'Active', createdAt: now })
await db.collection('gym_settings').doc(gymId).set({ onboarded: true, timezone: 'Asia/Kolkata' })
await db.collection('gym_subscriptions').doc(gymId).set({ plan: 'Trial', status: 'Trial', trialEndDate: new Date(Date.now() + 30 * 86400000).toISOString() })
const token = crypto.randomBytes(32).toString('base64url')
const trainerRef = db.collection('trainers').doc()
const trainerEmail = `tt.${run}@example.com`
await trainerRef.set({ gymId, name: 'Invited Trainer', email: trainerEmail, status: 'Invited', uid: null, inviteTokenHash: crypto.createHash('sha256').update(token).digest('hex'), inviteExpiresAt: new Date(Date.now() + 86400000).toISOString(), created_at: now })
const mine = db.collection('members').doc(); const notMine = db.collection('members').doc()
await mine.set({ gymId, name: 'Assigned Annie', email: `aa.${run}@example.com`, status: 'Active', plan: 'Gold', paymentFee: 5000, outstandingAmount: 4321, trainer_id: trainerRef.id, trainer_name: 'Invited Trainer', noFixedSchedule: true, created_at: now })
await notMine.set({ gymId, name: 'Unassigned Uma', email: `uu.${run}@example.com`, status: 'Active', plan: 'Gold', outstandingAmount: 0, trainer_id: null, noFixedSchedule: true, created_at: now })

const browser = await chromium.launch()
const go = async (page, url) => { await page.goto(url); await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { }) }
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage(); page.setDefaultNavigationTimeout(90000)
const errors = []; page.on('pageerror', e => errors.push(`${page.url()} :: ${e.message}`))

// Opening the invitation link must not change anything (mail scanners pre-fetch links).
const pre = await fetch(`${BASE}/api/invite/trainer?t=${token}`, { redirect: 'manual' })
check('invitation link only redirects to the registration form', pre.status >= 300 && pre.status < 400 && (pre.headers.get('location') || '').includes('/register?role=trainer&invite='), `${pre.status} ${pre.headers.get('location')}`)
check('…and does not activate the trainer', (await trainerRef.get()).data().status === 'Invited')

await go(page, `${BASE}/register?role=trainer&invite=${token}`)
await page.waitForFunction(() => document.querySelector('input[name="email"]')?.value?.includes('@'), null, { timeout: 30000 })
check('invitation pre-fills the invited e-mail', (await page.locator('input[name="email"]').inputValue()) === trainerEmail)
await page.locator('input[name="trainerName"]').fill('Invited Trainer')
const phone = page.locator('input[name="phone"]:visible').first(); if (await phone.count()) await phone.fill('9812300001')
await page.locator('input[name="password"]').fill(PW); await page.locator('input[name="confirmPassword"]').fill(PW)
for (const inp of await page.locator('input[required]:visible').all()) { if (!(await inp.inputValue())) await inp.fill('General') }
await page.locator('button[type="submit"]').click()
await page.getByText('Registration Complete').waitFor({ timeout: 60000 })
const t = (await trainerRef.get()).data()
const tUser = await auth.getUserByEmail(trainerEmail)
check('accepting links the login to the invited record and activates it', t.status === 'Active' && t.uid === tUser.uid && !t.inviteTokenHash, JSON.stringify({ status: t.status, uid: t.uid }))
check('no duplicate trainer record is created', (await db.collection('trainers').where('gymId', '==', gymId).get()).size === 1)
check('trainer claims are scoped to the gym', tUser.customClaims.role === 'trainer' && tUser.customClaims.gymCode === gymId)

await go(page, `${BASE}/login`); await page.getByRole('button', { name: /Coach view/ }).click()
await page.locator('input[type="email"]').fill(trainerEmail); await page.locator('input[type="password"]').fill(PW); await page.getByRole('button', { name: /^Sign in/ }).click()
await page.waitForURL(u => new URL(u).pathname.startsWith('/trainer'), { timeout: 60000 })
await go(page, `${BASE}/trainer/members`)
const html = await page.content()
check('trainer sees the assigned member', html.includes('Assigned Annie'))
check('trainer does not see unassigned members', !html.includes('Unassigned Uma'))
check('trainer is not sent financial data', !/outstandingAmount|paymentFee|paymentAmount|payment_status/.test(html))
for (const p of ['/members', '/dashboard/payments', '/super-admin', '/portal']) { await page.goto(`${BASE}${p}`); await page.waitForURL(u => new URL(u).pathname.startsWith('/trainer'), { timeout: 30000 }) }
check('trainer is kept out of owner, member and super-admin routes', true)

await go(page, `${BASE}/trainer/plans`)
await page.getByRole('button', { name: 'Edit' }).first().click()
const dlg = page.getByRole('dialog')
await dlg.locator('[data-testid="no-fixed-schedule"]').uncheck()
const monday = dlg.locator('div.rounded-xl', { hasText: 'Monday' }).last()
await monday.getByRole('button', { name: 'Back' }).click(); await monday.getByRole('button', { name: 'Arms' }).click()
await dlg.getByRole('button', { name: 'Save schedule' }).click()
await page.getByText(/Schedule saved/).waitFor({ timeout: 30000 })
const after = (await mine.get()).data()
check('trainer schedule is written to the member\'s canonical schedule', after.noFixedSchedule === false && JSON.stringify(after.schedule.Monday) === '["Back","Arms"]', JSON.stringify(after.schedule))
check('member is notified of the schedule change', (await db.collection('notifications').where('targetMemberId', '==', mine.id).get()).size === 1)

// Owner removes the trainer
const octx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const op = await octx.newPage(); op.setDefaultNavigationTimeout(90000)
await go(op, `${BASE}/login`); await op.getByRole('button', { name: /Full command center/ }).click()
await op.locator('input[type="email"]').fill(owner.email); await op.locator('input[type="password"]').fill(PW); await op.getByRole('button', { name: /^Sign in/ }).click()
await op.waitForURL(/dashboard/, { timeout: 60000 })
await go(op, `${BASE}/trainers`)
await op.getByRole('button', { name: 'Remove' }).locator('visible=true').first().click()
await op.getByRole('dialog').getByRole('button', { name: 'Remove trainer' }).click()
await op.getByText(/Trainer removed/).waitFor({ timeout: 30000 })
check('trainer record is removed', !(await trainerRef.get()).exists)
const m2 = await mine.get()
check('assigned member still exists and is unassigned', m2.exists && m2.data().trainer_id === null && m2.data().trainer_name === 'Unassigned')
check('other members are untouched', (await notMine.get()).exists && (await db.collection('members').where('gymId', '==', gymId).get()).size === 2)
let gone = false; try { await auth.getUser(tUser.uid) } catch { gone = true }
check('trainer login is deleted', gone)
await go(page, `${BASE}/trainer`)
check('removed trainer\'s session stops working', new URL(page.url()).pathname.startsWith('/login'), page.url())

// A member whose record was removed while signed in sees a clear message, not a crash.
const lost = await auth.createUser({ email: `lost.${run}@example.com`, password: PW, displayName: 'Lost Member' })
await auth.setCustomUserClaims(lost.uid, { role: 'member', gymCode: gymId })
await db.collection('members').doc(lost.uid).set({ gymId, authUid: lost.uid, name: 'Lost Member', email: lost.email, status: 'Active', noFixedSchedule: true, created_at: now })
await ctx.clearCookies()
await go(page, `${BASE}/login`); await page.getByRole('button', { name: /Your gym, in your pocket/ }).click()
await page.locator('input[type="email"]').fill(lost.email); await page.locator('input[type="password"]').fill(PW); await page.getByRole('button', { name: /^Sign in/ }).click()
await page.waitForURL(u => new URL(u).pathname.startsWith('/portal'), { timeout: 60000 })
await db.collection('members').doc(lost.uid).delete()
let shown = 0
for (const p of ['/portal', '/portal/schedule', '/portal/attendance', '/portal/membership', '/portal/billing', '/portal/profile', '/portal/insights', '/portal/live']) { await go(page, `${BASE}${p}`); if (/could not find your membership record|unavailable right now|In the gym right now/i.test(await page.locator('body').innerText())) shown++ }
check('member without a record gets a clear message on every portal page', shown === 8, `${shown}/8`)

// A suspended gym loses access immediately.
await db.collection('gyms').doc(gymId).update({ status: 'Suspended' })
await go(op, `${BASE}/dashboard`)
check('suspending a gym ends the owner\'s session at once (no redirect loop)', new URL(op.url()).pathname === '/login', op.url())
await db.collection('gyms').doc(gymId).update({ status: 'Active' })

await browser.close()
check('no page errors', errors.length === 0, errors.join(' | '))
console.log(failed ? `\n${failed} FAILED` : '\nAll trainer checks passed')
process.exit(failed ? 1 : 0)
