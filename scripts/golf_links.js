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
        const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href, classes: a.className })));
        console.log(JSON.stringify(links, null, 2));
    } finally { await browser.close(); }
})();
