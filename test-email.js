import { sendTrainerInviteEmail } from './lib/email.js';

async function run() {
    try {
        const result = await sendTrainerInviteEmail({
            email: 'test@example.com',
            name: 'Test Trainer',
            gymCode: 'G-123',
            salary: '50000',
            docId: 'mockdoc123'
        });
        console.log("Email Dispatch Result:", result);
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

run();
