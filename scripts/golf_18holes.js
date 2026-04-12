const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.locator('input[name="Input.Email"]').fill('marcnturner@gmail.com');
        await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        // I want the calendar for RNZAF Golf
        // Looking at common links
        const link = await page.getByRole('link', { name: /calendar|booking|rnzaf/i }).first();
        if (await link.count() > 0) {
            await link.click();
            await page.waitForTimeout(3000);
            console.log("Navigated to:", page.url());
            await page.screenshot({ path: 'calendar_page.png' });
        } else {
            console.log("No specific link found, checking for calendar icon...");
            const icon = await page.locator('.far.fa-calendar').first();
            await icon.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'calendar_icon_page.png' });
        }
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
})();
