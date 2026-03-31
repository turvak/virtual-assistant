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
        await page.waitForTimeout(10000);

        console.log('Final URL after login:', await page.url());
        console.log('Current Date in heading:', await page.innerText('h1, h2, .current-date, .date-display, div[id*="date"]'));
        
        // Find Tomorrow (April 1st) in the direct UI if it's there
        const nextBtn = await page.$('a[title="Next Day"], a:has-text("Next"), button:has-text("Next")');
        if (nextBtn) {
             await nextBtn.click();
             await page.waitForTimeout(5000);
             console.log('After "Next" click: Date:', await page.innerText('h1, h2, .current-date, .date-display'));
             console.log('Current URL:', await page.url());
             
             // Check rows again
             const rows = await page.$$eval('tr', els => els.map(el => el.innerText));
             rows.filter(r => r.includes(':')).forEach(r => console.log(r.replace(/\n/g, ' | ')));
        } else {
             console.log('Next button not found.');
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
