const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] 
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Logging in...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);

        console.log('Current URL:', await page.url());
        console.log('Current Page Heading:', await page.innerText('h1, h2, .current-date'));
        
        // Find links for "Next" day or "Next" booking.
        const links = await page.$$eval('a', els => els.map(el => ({ text: el.innerText.trim(), href: el.href })));
        const nextLinks = links.filter(l => l.text.toLowerCase().includes('next') || l.text === '>');
        console.log('Next links found:', JSON.stringify(nextLinks, null, 2));

        // Let's try navigating to the next day and checking the date again.
        if (nextLinks.length > 0) {
             const nextUrl = nextLinks[0].href;
             await page.goto(nextUrl);
             await page.waitForTimeout(5000);
             console.log('After "Next" click: URL = ', await page.url());
             console.log('New Date Text:', await page.innerText('h1, h2, .current-date, body'));
        }

        // List some rows to understand the structure.
        const rowTexts = await page.$$eval('tr', rows => rows.slice(0, 10).map(r => r.innerText));
        console.log('First 10 rows:', JSON.stringify(rowTexts, null, 2));

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
