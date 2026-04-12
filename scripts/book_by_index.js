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

        // From our links log, index 92 was '1 04:01 pm Book'.
        // Let's get all 'btn-book' and filter by parent text in one go.
        const books = await page.locator('.btn-book').all();
        console.log(`Found ${books.length} book buttons.`);
        for (const b of books) {
            const rowText = await b.evaluate(el => el.closest('.tee-card, .row, tr')?.innerText);
            if (rowText && rowText.includes('04:01 pm')) {
                console.log("Found 4:01 PM. Clicking...");
                await b.click();
                await page.waitForTimeout(5000);
                
                await page.locator('label:has-text("Marc Turner (1192)")').first().click();
                console.log("Selected Marc.");
                
                await page.getByRole('button', { name: "Save Selections" }).click();
                await page.waitForTimeout(5000);
                console.log("Saved.");
                
                await page.screenshot({ path: 'final_booking.png', fullPage: true });
                break;
            }
        }
    } finally { await browser.close(); }
})();
