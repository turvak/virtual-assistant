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

        const bookButtons = await page.getByRole('button', { name: 'Book' }).all();
        for (const btn of bookButtons) {
            const parentText = await btn.evaluate(el => el.closest('.tee-time, tr, .row')?.innerText);
            if (parentText && (parentText.includes('04:01 pm') || parentText.includes('4:01'))) {
                 console.log('Clicking Book for 4:01 PM...');
                 await btn.click();
                 await page.waitForTimeout(3000);
                 
                 const confirmBtn = await page.getByRole('button', { name: "Confirm" });
                 if (await confirmBtn.count() > 0) {
                     console.log('Clicking Confirm...');
                     await confirmBtn.click();
                     await page.waitForTimeout(5000);
                     await page.screenshot({ path: 'booking_final_success.png', fullPage: true });
                     console.log('Booking confirmed.');
                 } else {
                     console.log('Confirm button not found in dialog.');
                 }
                 break;
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
