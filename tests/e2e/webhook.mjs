// Razorpay webhook integration test (emulators + running app, see run.mjs).
// Sends correctly signed events exactly as Razorpay would and verifies both
// payment flows, idempotency on retries, amount checks and refunds.
import crypto from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('Emulator env not set.'); process.exit(2) }
const BASE = process.env.APP_URL || 'http://localhost:3100'
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
const db = getFirestore()
const run = Date.now().toString(36)
const gymId = `GYM-WHK-${run.slice(-4).toUpperCase()}`
let failed = 0
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : ' — ' + extra}`); if (!cond) failed++ }

async function send(event, { sign = true } = {}) {
  const body = JSON.stringify(event)
  const signature = sign ? crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex') : 'ab'.repeat(32)
  return fetch(`${BASE}/api/webhooks/razorpay`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature }, body })
}
const captured = (orderId, paymentId, amountPaise) => ({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise, status: 'captured', currency: 'INR' } } } })

const now = new Date().toISOString()
await db.collection('gyms').doc(gymId).set({ gymCode: gymId, gymName: 'Webhook Gym', email: `wh.${run}@example.com`, status: 'Active', createdAt: now })
await db.collection('gym_subscriptions').doc(gymId).set({ plan: 'Trial', status: 'Trial', trialEndDate: new Date(Date.now() + 5 * 86400000).toISOString() })
const memberRef = db.collection('members').doc(`wm-${run}`)
await memberRef.set({ gymId, name: 'Webhook Member', status: 'Active', paymentFee: 1500, paymentAmount: 500, outstandingAmount: 1000, payment_status: 'Partial' })

// ---- member → gym -------------------------------------------------------
const mOrder = `order_m_${run}`, mPay = `pay_m_${run}`
await db.collection('member_transactions').doc(mOrder).set({ order_id: mOrder, gymId, memberId: memberRef.id, memberName: 'Webhook Member', amount: 1000, amountInPaise: 100000, method: 'Razorpay', status: 'CREATED', created_at: now })

check('unsigned / wrongly signed event is rejected', (await send(captured(mOrder, mPay, 100000), { sign: false })).status === 400)
check('…and changes nothing', (await memberRef.get()).data().outstandingAmount === 1000)

check('amount mismatch is ignored', (await send(captured(mOrder, `${mPay}_x`, 100)).then(r => r.status)) === 200 && (await memberRef.get()).data().outstandingAmount === 1000)

await send(captured(mOrder, mPay, 100000))
let m = (await memberRef.get()).data()
check('member payment captured → ledger PAID, dues cleared', (await db.collection('member_transactions').doc(mOrder).get()).data().status === 'PAID' && m.outstandingAmount === 0 && m.paymentAmount === 1500 && m.payment_status === 'Paid', JSON.stringify(m))

await send(captured(mOrder, mPay, 100000)); await send({ ...captured(mOrder, mPay, 100000), event: 'order.paid' })
m = (await memberRef.get()).data()
check('retries / order.paid do not apply the payment twice', m.paymentAmount === 1500 && m.outstandingAmount === 0, JSON.stringify(m))
check('owner is notified exactly once', (await db.collection('notifications').where('gymId', '==', gymId).where('title', '==', 'Payment received').get()).size === 1)

await send({ event: 'refund.processed', payload: { refund: { entity: { payment_id: mPay } }, payment: { entity: { id: mPay, order_id: mOrder } } } })
await send({ event: 'refund.processed', payload: { refund: { entity: { payment_id: mPay } }, payment: { entity: { id: mPay, order_id: mOrder } } } })
m = (await memberRef.get()).data()
check('refund restores the dues once and marks the ledger REFUNDED', (await db.collection('member_transactions').doc(mOrder).get()).data().status === 'REFUNDED' && m.outstandingAmount === 1000 && m.paymentAmount === 500, JSON.stringify(m))

// ---- gym → BGM ----------------------------------------------------------
const gOrder = `order_g_${run}`, gPay = `pay_g_${run}`
await db.collection('payment_logs').doc(gOrder).set({ order_id: gOrder, gymId, plan: 'usage-v1', amount: 5018, amountInPaise: 501800, includesRegistrationFee: true, status: 'pending', created_at: now })
await send(captured(gOrder, gPay, 501800))
let sub = (await db.collection('gym_subscriptions').doc(gymId).get()).data()
const firstExpiry = sub.subscriptionExpiryDate
check('gym payment captured → subscription Active, registration fee recorded', sub.status === 'Active' && sub.registrationFeePaid === true && new Date(firstExpiry).getTime() > Date.now() + 27 * 86400000, JSON.stringify(sub))
check('captured transaction stored under the payment id', (await db.collection('transactions').doc(gPay).get()).data()?.status === 'captured')
await send(captured(gOrder, gPay, 501800))
sub = (await db.collection('gym_subscriptions').doc(gymId).get()).data()
check('webhook retry does not extend the subscription again', sub.subscriptionExpiryDate === firstExpiry)

const fOrder = `order_f_${run}`
await db.collection('payment_logs').doc(fOrder).set({ order_id: fOrder, gymId, plan: 'usage-v1', amount: 2019, amountInPaise: 201900, status: 'pending', created_at: now })
await send({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_failed', order_id: fOrder, amount: 201900, status: 'failed', error_description: 'Card declined' } } } })
check('failed payment is recorded and does not change the subscription', (await db.collection('payment_logs').doc(fOrder).get()).data().status === 'failed' && (await db.collection('gym_subscriptions').doc(gymId).get()).data().subscriptionExpiryDate === firstExpiry)

console.log(failed ? `\n${failed} FAILED` : '\nAll webhook checks passed')
process.exit(failed ? 1 : 0)
