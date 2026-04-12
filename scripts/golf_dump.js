const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('input[name="Input.Email"]', 'marcnturner@gmail.com');
        await page.fill('input[name="Input.Password"]', '+2doublebogie');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/Home**');
        await page.locator('.far.fa-calendar').click();
        await page.waitForTimeout(5000);
        console.log("Current URL:", page.url());
        const html = await page.content();
        console.log("HTML length:", html.length);
        const text = await page.evaluate(() => document.body.innerText);
        console.log("Main text:", text.substring(0, 1000));
        await page.screenshot({ path: 'golf_debug.png' });
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
})();
