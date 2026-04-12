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

        const bookLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button, [role=button]'))
                .filter(el => el.innerText.trim().toLowerCase() === 'book')
                .map(el => ({ text: el.innerText, parent: el.parentElement.innerText.replace(/\n/g, ' '), index: Array.from(document.querySelectorAll('a, button, [role=button]')).indexOf(el) }));
        });
        console.log("Book elements found:", JSON.stringify(bookLinks, null, 2));

        const target = bookLinks.find(b => b.parent.match(/4:|16:/));
        if (target) {
            console.log("Clicking target:", target);
            const elements = await page.locator('a, button, [role=button]').all();
            await elements[target.index].click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'booking_confirm_test.png' });
        }
    } finally { await browser.close(); }
})();
