const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] 
        });
        const page = await browser.newPage();
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);
        console.log('Post-login UR:', await page.url());

        // Find "Tee Bookings"
        const teeLink = await page.$('a:has-text("Tee Bookings")');
        if (teeLink) {
             console.log('Found "Tee Bookings" link, clicking...');
             await teeLink.click();
             await page.waitForTimeout(10000);
        } else {
             console.log('"Tee Bookings" link not found. Trying direct URL...');
             await page.goto('https://www.18holes.co.nz/Booking');
             await page.waitForTimeout(10000);
        }
        
        console.log('Booking Page URL:', await page.url());
        
        // Select tomorrow's date: Wednesday, 1 April 2026
        // Today is Mar 31.
        const nextUrl = await page.$eval('a[title="Next Day"], a:has-text("Next"), button:has-text("Next")', el => el.href).catch(() => null);
        if (nextUrl) {
             await page.goto(nextUrl);
             await page.waitForTimeout(5000);
             console.log('Date reached:', await page.innerText('h1, h2, .current-date, .date-display'));
        }

        console.log('Finding empty 4:00 PM slot...');
        const slots = await page.$$eval('tr', rows => rows.map(r => r.innerText));
        slots.filter(s => s.includes(':')).forEach(s => console.log(s));

    } catch (err) {
        console.error('Task failed during execution:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
