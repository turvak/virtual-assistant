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
        console.log('Final URL after login:', await page.url());

        // Nav to Booking
        await page.goto('https://www.18holes.co.nz/Booking');
        await page.waitForTimeout(5000);

        // Find date navigation buttons
        const dateText = await page.innerText('.current-date, .date-display, h2, h1');
        console.log('Initial date on Booking page:', dateText);

        const nextButtons = await page.$$eval('a, button', (els) => els.filter(el => el.innerText.trim() === 'Next' || el.innerText.trim() === '>' || el.innerText.trim().includes('Next')).map(el => ({ text: el.innerText, id: el.id })));
        console.log('Next buttons found:', nextButtons.length);

        console.log('Attempting direct date search via URL...');
        await page.goto('https://www.18holes.co.nz/Booking/Index?date=2026-04-01');
        await page.waitForTimeout(5000);
        console.log('After direct navigation, Current Date Text:', await page.innerText('.current-date, .date-display, h2, h1'));
        
        const contents = await page.innerText('body');
        console.log('Page has "April"? -> ', contents.includes('April'));
        console.log('Page has "1"? -> ', contents.includes('1'));

        const bookCount = await page.getByRole('link', { name: 'Book', exact: true }).count();
        console.log(`Found ${bookCount} "Book" buttons on this date.`);

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
