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
        console.log('Logged in URL:', await page.url());

        // Find all links to see what Tee Booking looks like
        const links = await page.$$eval('a', (els) => els.map(el => ({ text: el.innerText, href: el.href })));
        const teeLink = links.find(l => l.text.toLowerCase().includes('tee booking'));
        console.log('Tee Booking Link found:', JSON.stringify(teeLink, null, 2));

        if (teeLink) {
             await page.goto(teeLink.href);
             await page.waitForTimeout(5000);
             console.log('After clicking Tee Booking URL:', await page.url());
             await page.screenshot({ path: 'tee_booking_page.png' });
        }

    } catch (err) {
        console.error('Debug step 2 failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
