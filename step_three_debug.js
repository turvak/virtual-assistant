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
        console.log('Navigating to Booking...');
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);
        console.log('Final URL:', await page.url());
        
        const content = await page.innerText('body');
        console.log('Page has "RNZAF"? -> ', content.includes('RNZAF'));
        console.log('Page has Date? -> ', content.includes('2026') || content.includes('2025'));

        // Look for buttons that might be used for Booking
        const buttons = await page.$$eval('a, button', (els) => els.map(el => ({ text: el.innerText.trim(), href: el.href })));
        const bookBtns = buttons.filter(b => b.text.toLowerCase().includes('book'));
        console.log('Found Book buttons:', bookBtns.length);

    } catch (err) {
        console.error('Debug step 3 failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
