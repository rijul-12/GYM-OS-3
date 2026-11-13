import { getSubscriptionUrl, getTrainerInviteUrl, getAppUrl, OFFICIAL_APP_URL } from './url-builder';

// -----------------------------------------------------------------------
// Transactional e-mail.
//
// Provider selection (first configured wins):
//   1. Resend   — RESEND_API_KEY
//   2. SMTP     — SMTP_HOST, SMTP_USER, SMTP_PASS (+ SMTP_PORT, SMTP_SECURE)
//
// When no provider is configured sendEmail() returns
// { success: false, notConfigured: true, missing: [...] } so callers can
// report the exact blocker. It never pretends that an e-mail was sent.
// -----------------------------------------------------------------------

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@gymos.app';

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function getEmailConfigStatus() {
    if (process.env.RESEND_API_KEY) return { configured: true, provider: 'Resend', missing: [] };
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !process.env[k]);
    if (missing.length === 0) return { configured: true, provider: 'SMTP', missing: [] };
    return { configured: false, provider: null, missing: ['RESEND_API_KEY (or ' + missing.join(', ') + ')'] };
}

function fromAddress() {
    return process.env.EMAIL_FROM || `BGM <${process.env.SMTP_USER || 'no-reply@gymos.app'}>`;
}

function renderTemplate({ subject, preheader, headline, greeting, bodyHtml, button }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;background-color:#0c0c0c;color:#ffffff;padding:0;margin:0;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader || subject)}</div>
<div style="max-width:600px;margin:40px auto;background-color:#121212;border:1px solid #222222;border-radius:12px;overflow:hidden;">
  <div style="padding:32px;border-bottom:1px solid #222;text-align:center;">
    <h1 style="font-size:24px;font-weight:800;color:#ef4444;letter-spacing:-1px;margin:0;">BGM</h1>
    <p style="margin:4px 0 0;color:#888;font-size:12px;">Best Gym Manager</p>
  </div>
  <div style="padding:40px;">
    <h2 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">${escapeHtml(headline)}</h2>
    ${greeting ? `<div style="font-size:16px;margin-bottom:24px;color:#aaaaaa;">${escapeHtml(greeting)}</div>` : ''}
    <div style="font-size:15px;color:#cccccc;margin-bottom:32px;">${bodyHtml}</div>
    ${button ? `<div style="text-align:center;"><a href="${escapeHtml(button.url)}" style="display:inline-block;background-color:#ef4444;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;border-radius:8px;margin-bottom:32px;">${escapeHtml(button.text)}</a></div>` : ''}
  </div>
  <div style="padding:32px 40px;text-align:center;border-top:1px solid #222222;background-color:#0a0a0a;">
    <p style="color:#666;font-size:12px;margin:4px 0;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#ef4444;">${SUPPORT_EMAIL}</a></p>
    <p style="margin-top:16px;font-size:12px;">
      <a href="${OFFICIAL_APP_URL}/privacy" style="color:#aaa;text-decoration:none;margin:0 10px;">Privacy Policy</a>
      <a href="${OFFICIAL_APP_URL}/terms" style="color:#aaa;text-decoration:none;margin:0 10px;">Terms of Service</a>
    </p>
    <p style="color:#666;font-size:12px;margin-top:16px;">Your gym runs. BGM handles the rest.</p>
    <p style="color:#666;font-size:12px;">© ${new Date().getFullYear()} BGM — Best Gym Manager. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Sends an e-mail. `bodyHtml` is trusted markup written by the caller — any
 * user supplied value interpolated into it MUST go through escapeHtml().
 */
export async function sendEmail({ to, subject, preheader, headline, greeting, bodyHtml, button }) {
    if (!to) return { success: false, error: 'No recipient' };
    const status = getEmailConfigStatus();
    if (!status.configured) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[email:not-configured] to=${to} subject="${subject}"${button ? ` link=${button.url}` : ''}`);
        } else {
            console.error(`[email] not sent — missing ${status.missing.join(', ')}`);
        }
        return { success: false, notConfigured: true, missing: status.missing, error: `E-mail is not configured. Missing: ${status.missing.join(', ')}` };
    }

    const html = renderTemplate({ subject, preheader, headline: headline || subject, greeting, bodyHtml: bodyHtml || '', button });

    try {
        if (status.provider === 'Resend') {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const { data, error } = await resend.emails.send({ from: fromAddress(), to, subject, html });
            if (error) return { success: false, error: error.message || 'Resend rejected the message' };
            return { success: true, messageId: data?.id || null, provider: 'Resend' };
        }

        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const info = await transporter.sendMail({ from: fromAddress(), to, subject, html });
        return { success: true, messageId: info.messageId, provider: 'SMTP' };
    } catch (error) {
        console.error('[email] dispatch failed:', error.message);
        return { success: false, error: 'E-mail dispatch failed: ' + error.message };
    }
}

export async function sendPaymentConfirmationEmail({ ownerEmail, gymName, plan, paymentId, amount }) {
    const bodyHtml = `
        <p>Dear ${escapeHtml(gymName)},</p>
        <p>This is your payment receipt for your BGM subscription.</p>
        <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border:1px solid #333;border-radius:8px;">
            <tr><td style="padding:10px 16px;color:#aaa;">Transaction ID</td><td style="padding:10px 16px;text-align:right;font-family:monospace;color:#fff;">${escapeHtml(paymentId)}</td></tr>
            <tr><td style="padding:10px 16px;color:#aaa;">Product</td><td style="padding:10px 16px;text-align:right;color:#fff;">BGM ${escapeHtml(plan)}</td></tr>
            <tr><td style="padding:10px 16px;color:#aaa;">Date paid</td><td style="padding:10px 16px;text-align:right;color:#fff;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td></tr>
            <tr><td style="padding:10px 16px;color:#aaa;">Total</td><td style="padding:10px 16px;text-align:right;font-weight:bold;font-size:20px;color:#ef4444;">₹${escapeHtml(amount)}</td></tr>
        </table>`;
    return sendEmail({
        to: ownerEmail,
        subject: 'Receipt: your BGM subscription',
        headline: 'Payment successful',
        preheader: `Thank you for your payment of ₹${amount}.`,
        greeting: 'Your payment was received.',
        bodyHtml,
        button: { text: 'Manage subscription', url: getSubscriptionUrl() }
    });
}

export async function sendTrainerInviteEmail({ email, name, gymName, token }) {
    const bodyHtml = `
        <p>Hi ${escapeHtml(name)},</p>
        <p>You have been invited to join <strong>${escapeHtml(gymName)}</strong> as a trainer on BGM.</p>
        <p>Accept the invitation to create your trainer account. The link is personal — please do not forward it.</p>`;
    return sendEmail({
        to: email,
        subject: `Trainer invitation from ${gymName}`,
        headline: 'You are invited',
        preheader: `${gymName} invited you to join as a trainer.`,
        bodyHtml,
        button: { text: 'Accept invitation', url: getTrainerInviteUrl(token) }
    });
}

export { getAppUrl };
