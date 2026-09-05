import { adminDb } from '@/lib/firebase/server'
import { sendEmail } from '@/lib/mail'
import { NextResponse } from 'next/server'

export const maxDuration = 60; // Extra time for bulk mailing
export const dynamic = 'force-dynamic';

export async function GET(req) {
    // Vercel Cron Authentication
    if (process.env.CRON_SECRET) {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 })
        }
    }

    if (!adminDb) return NextResponse.json({ success: false, reason: "No DB" })

    const subsSnap = await adminDb.collection('gym_subscriptions').get();
    const gymsSnap = await adminDb.collection('gym_settings').get();

    // Map gym emails
    const gymEmails = gymsSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().ownerEmail || doc.data().email;
        return acc;
    }, {});

    const now = Date.now();
    const DISPATCHES = [];

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    subsSnap.docs.forEach(doc => {
        const data = doc.data();
        const gymId = doc.id;
        const email = gymEmails[gymId];
        if (!email) return;

        let targetDate = null;
        let isTrial = false;

        if (data.status === 'Trial' && data.trialEndDate) {
            targetDate = new Date(data.trialEndDate).getTime();
            isTrial = true;
        } else if (data.status === 'Active' && data.subscriptionExpiryDate) {
            targetDate = new Date(data.subscriptionExpiryDate).getTime();
        }

        if (!targetDate) return;

        const daysRemaining = Math.floor((targetDate - now) / MS_PER_DAY);

        let subject = null;
        let html = null;

        if (daysRemaining === 30 && isTrial) {
            subject = 'BGM Trial Update: 30 Days Remaining';
            html = `<p>Hi there, hope you are loving BGM! Just a reminder that you have 30 days left in your 2-month free trial.</p>`;
        } else if (daysRemaining === 14 && isTrial) {
            subject = 'BGM Trial Update: 14 Days Remaining';
            html = `<p>Hi there, you have exactly 14 days left in your 2-month trial. Consider upgrading to a paid plan soon.</p>`;
        } else if (daysRemaining === 7 && isTrial) {
            subject = 'Your BGM Trial Expires in 7 Days!';
            html = `<p>Hi there, hope you are loving BGM! Just a reminder that your fully-featured trial expires in exactly 7 days. Upgrade to a paid plan today to avoid any disruptions.</p>`;
        } else if (daysRemaining === 3) {
            subject = `BGM Action Required: ${isTrial ? 'Trial' : 'Subscription'} Expires in 3 Days`;
            html = `<p>Time is running out! Your ${isTrial ? 'trial' : 'subscription'} expires in 3 days. Navigate to your BGM dashboard to renew.</p>`;
        } else if (daysRemaining === 1) {
            subject = `BGM Urgent: 24 Hours Remaining!`;
            html = `<p>Your BGM access expires tomorrow! If not renewed, your portal will be locked into Read-Only mode and all mutations will be disabled.</p>`;
        } else if (daysRemaining <= 0 && data.status !== 'Expired') {
            subject = `BGM: Read-Only Mode Activated`;
            html = `<p>Your ${isTrial ? 'trial' : 'subscription'} has officially expired. Your portal has been downgraded to Read-Only mode. Active members and operations have been paused until you renew your subscription.</p>`;

            // Automatically mark expired in DB if not already
            adminDb.collection('gym_subscriptions').doc(gymId).update({ status: 'Expired' });
        }

        if (subject && html) {
            DISPATCHES.push(sendEmail({ to: email, subject, html }));
        }
    });

    await Promise.all(DISPATCHES);

    return NextResponse.json({
        success: true,
        swept: subsSnap.size,
        emailsSent: DISPATCHES.length
    });
}
