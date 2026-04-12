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
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);
        await page.getByRole('link', { name: 'Mon 13' }).click();
        await page.waitForTimeout(5000);
        
        const teeTimes = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.tee-time, [class*="tee-time"], [class*="booking-row"]'))
                .map(el => el.innerText.trim());
        });
        console.log("Tee Times Elements:", JSON.stringify(teeTimes));
        
        // Let's get the full HTML of a small section near 16:0
        const sectionHTML = await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('*'))
                .find(e => e.innerText.includes('16:0') || e.innerText.includes('4:00'));
            return el ? el.outerHTML : "Not Found";
        });
        console.log("Section HTML:", sectionHTML.substring(0, 1000));
        
        await page.screenshot({ path: 'monday_detailed.png', fullPage: true });

    } finally { await browser.close(); }
})();
