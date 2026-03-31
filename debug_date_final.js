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
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);

        console.log('Today URL date:', await page.url());
        console.log('Today Date Heading:', await page.innerText('h1, h2, .current-date, .date-display'));

        // Next Day logic
        const nextUrl = await page.$eval('a[title="Next Day"], a:has-text("Next")', el => el.href).catch(() => null);
        if (nextUrl) {
             console.log('Next button href found:', nextUrl);
             await page.goto(nextUrl);
             await page.waitForTimeout(5000);
             console.log('Moved to Date:', await page.innerText('h1, h2, .current-date, .date-display'));
             console.log('After Next URL:', await page.url());
             
             // Check for 4:00 PM (16:00) rows
             const content = await page.innerText('body');
             if (content.includes('16:00') || content.includes('4:00 PM')) {
                  console.log('16:00/4:00 PM slots exist.');
             } else {
                  console.log('No 16:00/4:00 PM slots listed in text.');
             }
        } else {
             console.log('No "Next Day" button/link found via selector.');
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
