const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        console.log("Navigating to login...");
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('input[name="Input.Email"]', 'marcnturner@gmail.com');
        await page.fill('input[name="Input.Password"]', '+2doublebogie');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/Home**');

        console.log("Heading to calendar...");
        await page.locator('.far.fa-calendar').click();
        await page.waitForTimeout(3000);

        // Monday 2026-04-13. 
        // We need to look for a way to select the date or find the Monday column
        // Take a high-res screenshot to help identify the daily slots
        await page.setViewportSize({ width: 1920, height: 2000 });
        await page.screenshot({ path: 'calendar_details.png' });

        // Let's list some helpful text to find the day
        const days = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.day-heading, .date-header, .fc-col-header-cell-cushion'))
                .map(d => d.innerText.trim());
        });
        console.log("Day headers found:", JSON.stringify(days));

        // Try to click Monday if it's there
        const monday = await page.getByText(/Mon|13/i);
        if (await monday.count() > 0) {
            console.log("Found Monday/13, clicking...");
            await monday.first().click();
            await page.waitForTimeout(2000);
        }

        // Look for slots around 16:00
        const slots = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a, button, [role="button"]'))
                .filter(el => el.innerText.includes('16:') || el.innerText.includes('4:'))
                .map(el => ({ text: el.innerText.trim(), visible: el.offsetParent !== null }));
        });
        console.log("Potential 4pm slots:", JSON.stringify(slots));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await browser.close();
    }
})();
