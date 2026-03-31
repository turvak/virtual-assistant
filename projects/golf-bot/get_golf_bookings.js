const puppeteer = require('/root/.openclaw/workspace/node_modules/puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'networkidle2' });
        await page.type('#Input_Email', 'marcnturner@gmail.com');
        await page.type('#Input_Password', '+2doublebogie');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        const upcoming = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .filter(a => a.innerText.includes('2026') || a.innerText.includes('2025'))
                .map(a => a.innerText.trim().replace(/\s+/g, ' '));
        });

        console.log('RESULTS_START');
        console.log(JSON.stringify(upcoming));
        console.log('RESULTS_END');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
