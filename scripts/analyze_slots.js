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
        
        // Go to bookings
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);

        // Find date Navigation or the Date Picker
        console.log("Looking for Monday 13th...");
        
        // Let's find all buttons or links that look like dates
        const dateLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button, .date-selector'))
                .map(el => ({ text: el.innerText.trim(), tag: el.tagName }));
        });
        console.log("Date elements:", JSON.stringify(dateLinks));

        // Attempt to navigate to Monday 13 April
        // Check if there is a 'next' button for the week/day
        const nextDay = await page.locator('a:has-text("Next"), button:has-text("Next"), .next-day');
        if (await nextDay.count() > 0) {
            console.log("Found Next button, clicking to reach tomorrow...");
            await nextDay.first().click();
            await page.waitForTimeout(3000);
        }

        // Final detail check for 16:00 slots
        const slots = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button, [role="button"]'))
                .filter(el => el.innerText.match(/15:|16:|4:/))
                .map(el => ({ 
                    text: el.innerText.trim(), 
                    id: el.id, 
                    className: el.className,
                    isVisible: el.offsetParent !== null 
                }));
        });
        console.log("4pm Potential Slots:", JSON.stringify(slots));
        await page.screenshot({ path: 'monday_slots.png', fullPage: true });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
