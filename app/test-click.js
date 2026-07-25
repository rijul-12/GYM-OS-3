const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.setCookie({
        name: 'gymos_session',
        value: JSON.stringify({ role: 'member', expiresAt: '2030-01-01T00:00:00Z', gymCode: 'DEMO' }),
        domain: 'localhost',
        path: '/'
    });

    console.log("Navigating to portal...");
    await page.goto('http://localhost:3000/portal');

    console.log("Waiting 6 seconds...");
    await new Promise(r => setTimeout(r, 6000));

    console.log("Taking screenshot...");
    await page.screenshot({ path: 'D:\\Users\\rijul\\.gemini\\antigravity\\brain\\ae09f148-1579-4887-93c3-93e3696a8d93\\portal_screenshot.png' });
    console.log("Screenshot saved.");

    await browser.close();
})();
