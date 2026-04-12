const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.locator('input[name="Input.Email"]').fill('marcnturner@gmail.com');
        await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
        await page.click('button[type="submit"]');
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);
        await page.getByRole('link', { name: 'Mon 13' }).click();
        await page.waitForTimeout(5000);
        
        // Let's get all elements that could contain time and a button.
        const rowData = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.row, .tee-time, tr, div'))
                .filter(el => el.innerText.includes('16:') || el.innerText.includes('4:') || el.innerText.includes('Book'))
                .map(el => ({ 
                    tagName: el.tagName, 
                    id: el.id, 
                    className: el.className, 
                    text: el.innerText.trim(),
                    hasButton: el.querySelector('button') !== null
                }))
                .filter(el => el.text.length < 500); // Filter out massive block containers
        });
        console.log(JSON.stringify(rowData, null, 2));
    } finally { await browser.close(); }
})();
