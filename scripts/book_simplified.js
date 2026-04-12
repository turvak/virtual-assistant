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

        // Just search for the 4:08 text and find the button nearest to it.
        const timeLoc = await page.getByText(/4:0[0-9]|16:0[0-9]/).first();
        if (await timeLoc.count() > 0) {
            console.log("Found time 4:xx / 16:xx");
            // Find its row then button.
            const bookBtn = await page.locator('div,tr,.row', { hasText: '4:00' }).filter({ hasText: 'Book' }).first();
            if (await bookBtn.count() > 0) {
                await bookBtn.getByRole('button', { name: "Book" }).click();
                await page.waitForTimeout(3000);
                await page.screenshot({ path: 'booking_confirm_test.png' });
            } else {
                 const allBooks = await page.getByRole('button', { name: "Book" }).all();
                 console.log(`Found ${allBooks.length} buttons total.`);
                 for(let b of allBooks) {
                     let text = await b.evaluate(el => el.parentElement.innerText);
                     if(text.includes('4:') || text.includes('16:')) {
                         console.log("Clicking button via parent text match:", text);
                         await b.click();
                         await page.waitForTimeout(3000);
                         await page.screenshot({ path: 'booking_confirm_test.png' });
                         break;
                     }
                 }
            }
        }
    } finally { await browser.close(); }
})();
