// Responsive audit against the emulators (see run.mjs for how to start them).
// Seeds one gym with an owner, trainer, member and super admin, then loads every
// portal route at phone and tablet widths and checks:
//   • no horizontal page overflow
//   • the navigation menu opens and Sign out is reachable inside the viewport
import { createRequire } from 'node:module'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
const { chromium } = createRequire(import.meta.url)('playwright')

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) { console.error('Emulator env not set.'); process.exit(2) }
const BASE = process.env.APP_URL || 'http://localhost:3100'
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
const db = getFirestore(); const auth = getAuth()
const run = Date.now().toString(36); const gymId = `GYM-RSP-${run.slice(-4).toUpperCase()}`
const PW = 'Passw0rd!resp'
const now = new Date().toISOString()

async function user(email, name, claims) { const u = await auth.createUser({ email, password: PW, displayName: name }); await auth.setCustomUserClaims(u.uid, claims); return u.uid }
const ownerUid = await user(`o.${run}@example.com`, 'Responsive Owner With A Long Name', { role: 'owner', gymCode: gymId })
const trainerUid = await user(`t.${run}@example.com`, 'Tara Trainer', { role: 'trainer', gymCode: gymId })
const memberUid = await user(`m.${run}@example.com`, 'Mohan Member-Longsurname', { role: 'member', gymCode: gymId })
await user(`a.${run}@example.com`, 'Admin', { role: 'super_admin' })
await db.collection('gyms').doc(gymId).set({ gymCode: gymId, gymName: 'Responsive Fitness & Strength Club', ownerName: 'Responsive Owner', ownerUid, email: `o.${run}@example.com`, status: 'Active', createdAt: now })
await db.collection('gym_settings').doc(gymId).set({ onboarded: true, timezone: 'Asia/Kolkata', currency: '₹ INR', upi_enabled: true, upi_id: 'responsive@okhdfcbank', buildingCapacity: 80 })
await db.collection('users').doc(ownerUid).set({ uid: ownerUid, role: 'owner', gymCode: gymId })
await db.collection('trainers').doc(trainerUid).set({ gymId, uid: trainerUid, name: 'Tara Trainer', email: `t.${run}@example.com`, status: 'Active' })
await db.collection('plans').add({ gymId, name: 'Gold Annual Unlimited', price: 12000, cycle: 'Yearly', features: ['All access'], color: '#ef4444' })
await db.collection('members').doc(memberUid).set({ gymId, authUid: memberUid, name: 'Mohan Member-Longsurname', email: `m.${run}@example.com`, phone: '+919800000001', plan: 'Gold Annual Unlimited', status: 'Active', startDate: '2026-01-01', expiryDate: '2030-01-01', paymentFee: 12000, paymentAmount: 2000, outstandingAmount: 10000, payment_status: 'Partial', trainer_id: trainerUid, trainer_name: 'Tara Trainer', noFixedSchedule: false, schedule: { Monday: ['Chest', 'Shoulders'], Wednesday: ['Legs'] }, created_at: now })
for (let i = 0; i < 12; i++) await db.collection('members').add({ gymId, name: `Member Number ${i} With Quite A Long Name`, email: `x${i}.${run}@example.com`, phone: `+9198000001${String(i).padStart(2, '0')}`, plan: 'Gold Annual Unlimited', status: i % 4 === 0 ? 'Pending' : 'Active', expiryDate: i % 3 === 0 ? '2020-01-01' : '2030-01-01', outstandingAmount: i * 500, payment_status: 'Partial', trainer_id: i % 2 ? trainerUid : null, trainer_name: i % 2 ? 'Tara Trainer' : 'Unassigned', noFixedSchedule: true, created_at: now })
await db.collection('attendance').add({ gymId, member_id: memberUid, member_name: 'Mohan Member-Longsurname', check_in_time: now, check_out_time: null, status: 'Active', actual_workout: ['Chest', 'Shoulders'], method: 'QR' })
await db.collection('member_transactions').add({ gymId, memberId: memberUid, memberName: 'Mohan Member-Longsurname', amount: 2000, method: 'UPI', status: 'PENDING_VERIFICATION', created_at: now })

const PORTALS = [
  { role: 'owner', tag: 'Full command center', email: `o.${run}@example.com`, home: '/dashboard', routes: ['/dashboard', '/members', '/trainers', '/plans', '/dashboard/payments', '/occupancy', '/attendance-logs', '/analytics', '/dashboard/import', '/equipments', '/attendance-integrations', '/branding', '/dashboard/subscription', '/settings', '/settings?tab=attendance', '/settings?tab=billing', '/help'] },
  { role: 'trainer', tag: 'Coach view', email: `t.${run}@example.com`, home: '/trainer', routes: ['/trainer', '/trainer/members', '/trainer/plans', '/trainer/progress', '/trainer/live', '/trainer/profile'] },
  { role: 'member', tag: 'Your gym, in your pocket', email: `m.${run}@example.com`, home: '/portal', routes: ['/portal', '/portal/schedule', '/portal/live', '/portal/attendance', '/portal/membership', '/portal/billing', '/portal/insights', '/portal/profile', `/checkin/${gymId}`] },
  { role: 'super_admin', tag: 'Full command center', email: `a.${run}@example.com`, home: '/super-admin', routes: ['/super-admin', '/super-admin/gyms', '/super-admin/owners', '/super-admin/subscriptions', '/super-admin/analytics', '/super-admin/notifications', '/super-admin/support', '/super-admin/audit', '/super-admin/health', '/super-admin/reconciliation', '/super-admin/settings'] },
]
const PUBLIC = ['/', '/login', '/register', '/register?role=member', '/forgot-password', '/privacy', '/terms', '/refund', '/security']
const WIDTHS = [320, 360, 375, 390, 393, 414, 430, 768]

async function open(page, url) { for (let i = 0; i < 3; i++) { try { await page.goto(url); return } catch (e) { if (i === 2) throw e; await page.waitForTimeout(1500) } } }

const browser = await chromium.launch()
const problems = []; let checks = 0
const pageErrors = []
async function measure(page, label, width) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { })
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const wide = [...document.querySelectorAll('body *')].filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*="overflow-x-auto"]') && !el.closest('.recharts-wrapper') }).slice(0, 2).map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`)
    return { overflow: doc.scrollWidth - window.innerWidth, wide, text: document.body.innerText.slice(0, 300) }
  })
  checks++
  if (r.overflow > 1) problems.push(`${width}px ${label}: horizontal overflow ${r.overflow}px ${r.wide.join(' | ')}`)
  if (/Application error|Something went wrong|Unhandled Runtime Error/i.test(r.text)) problems.push(`${width}px ${label}: error screen`)
}

// Public pages
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } }); const page = await ctx.newPage(); page.setDefaultNavigationTimeout(90000)
  page.on('pageerror', e => pageErrors.push(`${page.url()} :: ${e.message}`))
  for (const w of [320, 390, 768]) { await page.setViewportSize({ width: w, height: 760 }); for (const r of PUBLIC) { await open(page, BASE + r); await measure(page, r, w) } }
  await ctx.close()
}

for (const p of PORTALS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultNavigationTimeout(90000)
  page.on('pageerror', e => pageErrors.push(`${page.url()} :: ${e.message}`))
  await page.goto(`${BASE}/login`); await page.getByRole('button', { name: new RegExp(p.tag) }).click()
  await page.locator('input[type="email"]').fill(p.email); await page.locator('input[type="password"]').fill(PW); await page.getByRole('button', { name: /^Sign in/ }).click()
  await page.waitForURL(u => new URL(u).pathname.startsWith(p.home), { timeout: 90000 })
  for (const r of p.routes) { await open(page, BASE + r); await measure(page, `${p.role} ${r}`, 390) } // warm up (dev compiles on first visit)
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 768 ? 1024 : 700 })
    for (const r of p.routes) { await open(page, BASE + r); await measure(page, `${p.role} ${r}`, w) }
    // Menu + sign-out reachability on a short viewport
    await open(page, BASE + p.home)
    await page.getByRole('button', { name: 'Open menu' }).click()
    const out = page.locator('[data-testid="sign-out"]:visible').first()
    await out.scrollIntoViewIfNeeded().catch(() => { })
    const box = await out.boundingBox().catch(() => null)
    checks++
    if (!box || box.y < 0 || box.y + box.height > (w === 768 ? 1024 : 700) + 1 || box.x < 0 || box.x + box.width > w + 1) problems.push(`${w}px ${p.role}: Sign out not reachable in the menu (${JSON.stringify(box)})`)
    await page.keyboard.press('Escape')
  }
  await ctx.close()
}
await browser.close()
console.log(`${checks} checks, ${problems.length} problems, ${[...new Set(pageErrors)].length} page errors`)
;[...new Set(problems)].slice(0, 60).forEach(p => console.log('  ' + p))
;[...new Set(pageErrors)].slice(0, 10).forEach(p => console.log('  ERR ' + p))
process.exit(problems.length || pageErrors.length ? 1 : 0)
