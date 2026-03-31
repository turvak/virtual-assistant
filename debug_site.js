const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        console.log('Navigating...');
        const response = await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'load', timeout: 30000 });
        console.log('Status:', response.status());
        
        const title = await page.title();
        console.log('Title:', title);

        const html = await page.content();
        console.log('HTML length:', html.length);
        
        // Log all input names to find the login fields correctly
        const inputs = await page.$$eval('input', (els) => els.map(el => ({ name: el.name, id: el.id, type: el.type, label: el.labels?.[0]?.innerText })));
        console.log('Inputs:', JSON.stringify(inputs, null, 2));

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
