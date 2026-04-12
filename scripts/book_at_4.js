const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.locator('input[name="Input.Email"]').fill('marcnturner@gmail.com');
        await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);
        
        console.log("Selecting Monday 13th...");
        const mon13 = await page.getByRole('link', { name: 'Mon 13' });
        await mon13.click();
        await page.waitForTimeout(5000);

        // Find the slot closest to 16:00
        console.log("Looking for 16:00 slot...");
        const slot4pm = await page.getByText(/16:0|4:/i).all();
        console.log(`Found ${slot4pm.length} potential slot matches.`);

        // Find the "Book" button related to that slot.
        // Usually buttons are children/siblings of the slot time.
        // Let's try to click the one that contains 16:0 interval.
        const targetSlot = await page.locator('.tee-time-row', { hasText: /16:0|4:00/i }).first();
        if (await targetSlot.count() > 0) {
            console.log("Found 4pm row, clicking Book...");
            await targetSlot.getByRole('button', { name: /book/i }).click();
            await page.waitForTimeout(5000);
            
            await page.screenshot({ path: 'booking_confirm_dialog.png' });
            console.log("Confirmation screenshot taken.");

            // If there's a "Confirm" button (seen in date analysis), click it.
            const confirmBtn = await page.getByRole('button', { name: "Confirm" });
            if (await confirmBtn.count() > 0) {
               console.log("Found Confirm button, finalising...");
               // UNCOMMENT TO ACTUALLY BOOK:
               // await confirmBtn.click();
               // await page.waitForTimeout(5000);
               // await page.screenshot({ path: 'booking_final.png' });
            }
        } else {
             console.log("4pm row not explicitly found with .tee-time-row class. Looking at buttons...");
             const buttons = await page.getByRole('button', { name: /book/i }).all();
             for(let btn of buttons) {
                 const text = await (await btn.parentElement()).innerText();
                 if(text.includes('16:') || text.includes('4pm')) {
                     console.log("Found matching button by parent text, clicking...");
                     await btn.click();
                     await page.waitForTimeout(3000);
                     break;
                 }
             }
        }
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
})();
