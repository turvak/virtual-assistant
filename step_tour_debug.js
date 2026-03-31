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
        console.log('Post-login URL:', await page.url());

        // Find "Whenuapai" or "RNZAF"
        const content = await page.content();
        console.log('Contains "RNZAF"? -> ', content.includes('RNZAF'));
        console.log('Contains "Whenuapai"? -> ', content.includes('Whenuapai'));

        const links = await page.$$eval('a', (els) => els.map(el => ({ text: el.innerText, href: el.href })));
        const clubLink = links.find(l => l.text.toLowerCase().includes('rnzaf') || l.text.toLowerCase().includes('whenuapai'));
        console.log('Club Link:', JSON.stringify(clubLink, null, 2));

        if (clubLink) {
             await page.goto(clubLink.href);
             await page.waitForTimeout(5000);
             console.log('Final Club Page:', await page.url());
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
