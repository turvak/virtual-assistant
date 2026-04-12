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
        
        // Find slot for 16:00
        console.log("Locating 16:00 slot row...");
        const possibleTimes = ['16:00', '16:04', '16:08', '16:12', '4:00', '4:04', '4:08'];
        for (let time of possibleTimes) {
            const row = await page.locator(`css=div,tr,a`, { hasText: time }).filter({ hasText: 'Book' }).first();
            if (await row.count() > 0) {
                console.log(`Found slot at ${time}. Clicking Book...`);
                await row.getByRole('button', { name: "Book" }).click();
                await page.waitForTimeout(3000);
                await page.screenshot({ path: 'booking_confirm_dialog.png' });
                
                // Final Check for Confirmation
                const confirmBtn = await page.getByRole('button', { name: "Confirm" });
                if (await confirmBtn.count() > 0) {
                   console.log("Confirm button found. Ready to book.");
                   // await confirmBtn.click(); // Final step
                } else {
                   console.log("No explicit Confirm button found yet. Screenshot taken.");
                }
                break;
            }
        }
    } finally { await browser.close(); }
})();
