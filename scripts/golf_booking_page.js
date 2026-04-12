const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.locator('input[name="Input.Email"]').fill('marcnturner@gmail.com');
        await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/');
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);
        console.log("On Booking page:", page.url());
        await page.screenshot({ path: 'booking_full_view.png', fullPage: true });
        
        // Find if any dates are listed for tomorrow (Monday 13th)
        const dateHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('h3, h4, h5, .date-header, button')).map(h => h.innerText.trim()));
        console.log("Date Headers:", JSON.stringify(dateHeaders));
        
        // Let's grab all text on the booking page
        const text = await page.evaluate(() => document.body.innerText);
        console.log("Booking Page Text Snippet:", text.substring(0, 2000));
        
    } finally { await browser.close(); }
})();
