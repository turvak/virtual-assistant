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
        await page.getByRole('link', { name: /Mon 13/ }).click();
        await page.waitForTimeout(5000);

        // Find the 'Book' link with 4:01 PM.
        const row = await page.locator('div,tr,.row', { hasText: '4:01 pm' }).filter({ hasText: 'Book' }).first();
        if (await row.count() > 0) {
            await row.getByRole('link', { name: "Book" }).click();
            await page.waitForTimeout(3000);
            
            // Select Marc Turner. Looking closer: recent playing partners names might be labels or checkboxes.
            const marcLabel = await page.getByRole('checkbox', { name: /Marc Turner/i });
            if (await marcLabel.count() > 0) {
                await marcLabel.check();
                console.log("Found and checked Marc checkbox.");
            } else {
                // If checkbox role is missing, click by label.
                await page.click('label:has-text("Marc Turner (1192)")');
                console.log("Clicked Marc's label.");
            }
            
            await page.waitForTimeout(1000);
            
            // Step 2: Save Selections
            await page.getByRole('button', { name: "Save Selections" }).click();
            await page.waitForTimeout(5000);
            
            // Step 3: Check for Final 'Book' button if it reappears or a final confirmation.
            // On some of these systems, clicking save selections sends you back to the booking grid 
            // where the row now says "Confirm" or has another button. 
            const finalBook = await page.getByRole('button', { name: "Finalise Booking" }).or(page.getByRole('button', { name: "Confirm Booking" }));
            if (await finalBook.count() > 0) {
                console.log("Final confirm found. Booking now.");
                await finalBook.click();
                await page.waitForTimeout(3000);
            }
            
            await page.screenshot({ path: 'final_booking_status.png', fullPage: true });
        }
    } finally { await browser.close(); }
})();
