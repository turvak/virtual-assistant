const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        console.log('Logging in...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        console.log('Waiting for login...');
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'post_login.png' });
        console.log('Login complete. Current URL:', await page.url());

        // Nav to Tee Bookings
        const teeLink = await page.$('a:has-text("Tee Bookings")');
        if (teeLink) {
             console.log('Found link, clicking...');
             await teeLink.click();
             await page.waitForTimeout(5000);
             await page.screenshot({ path: 'tee_bookings.png' });
        } else {
             console.log('No "Tee Bookings" link. Trying direct URL...');
             await page.goto('https://www.18holes.co.nz/TeeBookings/Index');
             await page.waitForTimeout(5000);
             await page.screenshot({ path: 'direct_tee_bookings.png' });
        }

        console.log('Setting date 2026-04-01...');
        await page.goto('https://www.18holes.co.nz/TeeBookings/Index?date=2026-04-01');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'april_first.png' });

        console.log('Looking for "Book" buttons...');
        const bookCount = await page.getByRole('link', { name: 'Book', exact: true }).count();
        console.log(`Found ${bookCount} "Book" buttons.`);

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
