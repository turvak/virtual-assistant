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
        await page.getByRole('link', { name: "Mon 13" }).click();
        await page.waitForTimeout(5000);

        // Find the '04:01 pm' card. 
        // Based on structure: It seems there are card-headers or rows.
        const header = await page.locator('div,tr,.row', { hasText: '4:01 pm' }).filter({ has: page.getByRole('link', { name: "Book" }) }).first();
        if (await header.count() > 0) {
            console.log("Found 4:01 PM header.");
            // Get the specific Book button within THIS header.
            const btn = await header.locator('.btn-book').first();
            await btn.click();
            await page.waitForTimeout(5000);
            
            // Try selecting Marc.
            const marcLabel = await page.locator('label:has-text("Marc Turner (1192)")').first();
            if (await marcLabel.count() > 0) {
                await marcLabel.click();
                console.log("Found and clicked Marc's label.");
            }
            
            // Save Selections
            const saveBtn = await page.getByRole('button', { name: "Save Selections" });
            if (await saveBtn.count() > 0) {
                await saveBtn.click();
                await page.waitForTimeout(5000);
                await page.screenshot({ path: 'booking_status.png', fullPage: true });
                console.log("Saved selections.");
            }
        } else {
            console.log("Header for 4:01 pm not found.");
        }
    } finally { await browser.close(); }
})();
