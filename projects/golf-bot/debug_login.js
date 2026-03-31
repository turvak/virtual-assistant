const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        console.log('Logging in...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        console.log('Waiting for login redirect...');
        await page.waitForTimeout(10000);
        const html = await page.content();
        console.log('Login HTML contains "Logout"? -> ', html.includes('Logout') || html.includes('Sign out') || html.includes('Log out'));
        console.log('Current URL:', await page.url());

    } catch (err) {
        console.error('Debug login failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
