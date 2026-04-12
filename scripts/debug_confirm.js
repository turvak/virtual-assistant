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
            const elements = Array.from(document.querySelectorAll('a, button, [role=button]'))
                .filter(el => el.innerText.trim().toLowerCase() === 'book' && el.parentElement.innerText.includes('04:01 pm'));
            return elements[0];
        });
        
        if (bookBtn) {
            console.log('Book button found for 4:01 PM.');
            await bookBtn.click();
            await page.waitForTimeout(3000);
            
            // Get text from the entire body or dialogue
            const text = await page.evaluate(() => document.body.innerText);
            console.log("Dialog visibility summary:", text.substring(0, 1000));
            
            // Re-identify all buttons
            const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()));
            console.log("Buttons in current view:", JSON.stringify(buttons));
            
            await page.screenshot({ path: 'dialog_debug.png' });
        } else {
            console.log("4:01 PM Book button not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
