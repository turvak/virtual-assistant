const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);
        await page.goto('https://www.18holes.co.nz/Booking/Club/RNZAF'); // Club names are used in 18holes systems.
        await page.waitForTimeout(5000);
        console.log('Final URL:', await page.url());

        // Check date nav again
        const dateNav = await page.$('input[type="date"]');
        if (dateNav) {
             await dateNav.fill('2026-04-01');
             await dateNav.press('Enter');
             await page.waitForTimeout(5000);
             console.log('After date input: ', await page.innerText('body'));
        } else {
             console.log('No date input found. Trying to find "Next" or "Day" buttons.');
             const links = await page.$$eval('a', (els) => els.map(el => ({ text: el.innerText.trim(), href: el.href })));
             const nextLink = links.find(l => l.text.toLowerCase().includes('next') || l.text === '>');
             if (nextLink) {
                 await page.goto(nextLink.href);
                 await page.waitForTimeout(5000);
                 console.log('After nextLink navigation: URL = ', await page.url());
             }
        }

        const frames = await page.frames();
        console.log('Number of frames:', frames.length);

        const screenshotPath = 'booking_debug.png';
        await page.screenshot({ path: screenshotPath });
        console.log('Screenshot taken: booking_debug.png');

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
