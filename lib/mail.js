import { Resend } from 'resend';

// Will fallback silently if RESEND_API_KEY is missing in env to prevent crashing local dev
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }) {
    if (!resend) {
        console.log(`[MAIL MOCK] -> To: ${to} | Subj: ${subject}`);
        return true;
    }

    try {
        const data = await resend.emails.send({
            from: 'GymOS Billing <billing@gymos.in>',
            to,
            subject,
            html,
        });
        return data;
    } catch (error) {
        console.error("Email dispatch failed:", error);
        return false;
    }
}
