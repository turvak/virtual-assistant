import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        console.log("Navigating to login page...");
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'networkidle' });

        console.log("Entering credentials...");
        await page.fill('input[name="Input.Email"]', 'marcnturner@gmail.com');
        await page.fill('input[name="Input.Password"]', '+2doublebogie');
        await page.click('button[type="submit"]');

        console.log("Waiting for redirection...");
        await page.waitForTimeout(5000);

        // Take a screenshot of the post-login state to see the interface
        console.log("Taking post-login screenshot...");
        await page.screenshot({ path: 'golf_home.png', fullPage: true });

        // Navigate to the member area/bookings
        // According to MEMORY.md: use the calendar icon shortcut ("far fa-calendar")
        console.log("Looking for booking calendar icon...");
        const calendarIcon = await page.locator('.far.fa-calendar');
        if (await calendarIcon.count() > 0) {
            console.log("Found calendar icon, clicking...");
            await calendarIcon.click();
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'golf_calendar.png', fullPage: true });
        } else {
            console.log("Calendar icon not found. Looking for alternatives...");
            // List all links to help identify navigation
            const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })));
            console.log("Links found:", JSON.stringify(links, null, 2));
        }

    } catch (error) {
        console.error("An error occurred:", error);
        await page.screenshot({ path: 'golf_error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
