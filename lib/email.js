import nodemailer from 'nodemailer';

// If SMTP is not defined, we'll try to use standard mock or fallback to console
const transportConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
        user: process.env.SMTP_USER || 'support@gymos.app',
        pass: process.env.SMTP_PASS || 'mock-password-123'
    }
}

// Fallback to ethereal or mock in development if strictly missing environment
const transporter = nodemailer.createTransport(transportConfig);

export async function sendEmail({ to, subject, preheader, headline, greeting, bodyHtml, button, supportEmail = "support@gymos.app" }) {

    // Core HTML scaffolding matching GymOS theme constraints 
    const htmlString = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #0c0c0c; color: #ffffff; padding: 0; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid #222222; border-radius: 12px; margin-top: 40px; margin-bottom: 40px; overflow: hidden; }
            .header { padding: 32px; background: linear-gradient(135deg, #ef444433, transparent); border-bottom: 1px solid #222; text-align: center; }
            .logo { font-size: 24px; font-weight: 800; color: #ef4444; letter-spacing: -1px; margin: 0; }
            .content { padding: 40px; }
            .headline { font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #ffffff; }
            .greeting { font-size: 16px; margin-bottom: 24px; color: #aaaaaa; }
            .body-text { font-size: 15px; color: #cccccc; margin-bottom: 32px; }
            .cta-button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 600; border-radius: 8px; margin-bottom: 32px; }
            .footer { padding: 32px 40px; text-align: center; border-top: 1px solid #222222; background-color: #0a0a0a; }
            .footer p { color: #666666; font-size: 12px; margin: 4px 0; }
            .footer-links a { color: #aaaaaa; text-decoration: none; margin: 0 10px; }
        </style>
    </head>
    <body>
        <div style="display: none; max-height: 0px; overflow: hidden;">${preheader || subject}</div>
        <div class="container">
            <div class="header">
                <h1 class="logo">GymOS</h1>
            </div>
            <div class="content">
                <h2 class="headline">${headline}</h2>
                <div class="greeting">${greeting}</div>
                <div class="body-text">
                    ${bodyHtml}
                </div>
                ${button ? `<div style="text-align: center;"><a href="${button.url}" class="cta-button">${button.text}</a></div>` : ''}
            </div>
            <div class="footer">
                <p>Need help? Contact <a href="mailto:${supportEmail}" style="color: #ef4444;">${supportEmail}</a></p>
                <div class="footer-links" style="margin-top: 16px;">
                    <a href="https://gymos.app/privacy">Privacy Policy</a>
                    <a href="https://gymos.app/terms">Terms of Service</a>
                </div>
                <p style="margin-top: 24px;">Built in India 🇮🇳</p>
                <p>© ${new Date().getFullYear()} GymOS. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        let activeTransporter = transporter;
        let isMock = false;

        // If credentials are left at default fallback, auto-generate Ethereal Test Nodes
        if (!process.env.SMTP_USER || process.env.SMTP_USER === 'support@gymos.app') {
            console.log("[GymOS Mailer] No production SMTP found. Bootstrapping Ethereal Preview...");
            const testAccount = await nodemailer.createTestAccount();
            activeTransporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            isMock = true;
        }

        const info = await activeTransporter.sendMail({
            from: `"GymOS System" <${isMock ? 'test@ethereal.email' : transportConfig.auth.user}>`,
            to,
            subject,
            html: htmlString
        });

        if (isMock) {
            console.log("-----------------------------------------");
            console.log(`[GymOS Ethereal Sender] 📨 Email Sent to: ${to}`);
            console.log(`🌐 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            console.log("-----------------------------------------");
        }

        return { success: true, messageId: info.messageId, previewUrl: isMock ? nodemailer.getTestMessageUrl(info) : null };
    } catch (error) {
        console.error("Email dispatch failed:", error);
        return { success: false, error: 'Email dispatch failed' };
    }
}
