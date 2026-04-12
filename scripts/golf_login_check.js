const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        console.log("On Login page");
        const emailInput = await page.locator('input[name="Input.Email"]');
        if (await emailInput.count() > 0) {
            console.log("Email field found");
            await emailInput.fill('marcnturner@gmail.com');
            await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
            console.log("Post-login URL:", page.url());
            await page.screenshot({ path: 'login_result.png' });
        } else {
             console.log("Email field NOT found. Page text:", await page.evaluate(() => document.body.innerText));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
