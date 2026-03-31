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
        await page.goto('https://www.18holes.co.nz/Booking?date=2026-04-01');
        await page.waitForTimeout(10000);

        const rowData = await page.$$eval('tr', rows => rows.map(r => r.innerText));
        console.log('Row Data from page:');
        rowData.filter(d => d.includes(':')).forEach(d => console.log(d.replace(/\n/g, ' | ')));

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
