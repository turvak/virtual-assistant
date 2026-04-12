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

        const bookBtn = await page.evaluateHandle(() => {
            return Array.from(document.querySelectorAll('a, button, [role=button]'))
                .find(el => el.innerText.trim().toLowerCase() === 'book' && el.parentElement.innerText.includes('04:01 pm'));
        });
        
        if (bookBtn) {
            await bookBtn.click();
            await page.waitForTimeout(3000);
            
            // Check the box for Marc Turner (ID 1192)
            console.log("Checking checkbox for Marc Turner...");
            const marcCheckbox = await page.locator('label:has-text("Marc Turner (1192)")').locator('input[type="checkbox"]');
            if (await marcCheckbox.count() > 0) {
               await marcCheckbox.check();
               await page.waitForTimeout(1000);
               console.log("Marc Turner selected.");
            } else {
               // If checkbox is not directly findable this way, try clicking the label.
               await page.click('label:has-text("Marc Turner (1192)")');
               console.log("Clicked Marc Turner label.");
            }
            
            // Click "Save Selections"
            const saveBtn = await page.getByRole('button', { name: "Save Selections" });
            if (await saveBtn.count() > 0) {
                console.log("Clicking Save Selections...");
                await saveBtn.click();
                await page.waitForTimeout(5000);
                await page.screenshot({ path: 'booking_success_check.png', fullPage: true });
                
                // FINAL STEP: After save, check if a "Confirm Booking" or final button appears.
                const text = await page.evaluate(() => document.body.innerText);
                console.log("Page text after save snippet:", text.substring(0, 1000));
            } else {
                console.log("Save Selections button not found.");
            }
        }
    } finally { await browser.close(); }
})();
