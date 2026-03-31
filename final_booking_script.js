const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable', headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Logging in...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'domcontentloaded' });
        await page.fill('#Input_Email', 'marcnturner@gmail.com');
        await page.fill('#Input_Password', '+2doublebogie');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);
        console.log('Navigating to Booking...');
        await page.goto('https://www.18holes.co.nz/Booking/Index?date=2026-04-01', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(10000);

        console.log('URL: ', await page.url());

        // Relaxed search for 4:00 PM (16:00) empty slot
        const rows = await page.locator('tr').all();
        let minDiff = Infinity;
        let selectedRow = null;
        let selectedTime = '';

        for (const row of rows) {
            const txt = await row.innerText();
            const timeMatch = txt.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
            const bookBtns = await row.locator('a, button').filter({ hasText: /^Book$/i }).all();

            if (timeMatch && bookBtns.length > 0) {
                let h = parseInt(timeMatch[1]);
                let m = parseInt(timeMatch[2]);
                let p = (timeMatch[3] || '').toUpperCase();
                if (p === 'PM' && h < 12) h += 12;
                if (p === 'AM' && h === 12) h = 0;
                
                const slotMinutes = h * 60 + m;
                const diff = Math.abs(slotMinutes - (16 * 60));

                // "NO other players" - check if this row has any text that looks like a name or handicap (e.g. "(12.4)")
                const isOccupied = /\(\d+\.?\d*\)/.test(txt) || /Confirmed|Reserved/i.test(txt);

                if (!isOccupied && diff < minDiff) {
                    minDiff = diff;
                    selectedRow = row;
                    selectedTime = timeMatch[0];
                }
            }
        }

        if (selectedRow) {
            console.log(`Found candidate at ${selectedTime}. Clicking Book...`);
            await selectedRow.locator('a, button').filter({ hasText: /^Book$/i }).first().click();
            await page.waitForTimeout(8000);

            console.log('Adding James Lee...');
            const search = await page.$('input[placeholder*="Search"], input[id*="Nominate"], input[name*="Player"]');
            if (search) {
                await search.fill('James Lee');
                await page.waitForTimeout(3000);
                await page.keyboard.press('ArrowDown');
                await page.keyboard.press('Enter');
            }

            console.log('Saving Selection...');
            const save = await page.locator('button, a').filter({ hasText: /Save Selection|Confirm|Book/i }).first();
            if (await save.isVisible()) {
                await save.click();
                await page.waitForTimeout(5000);
                console.log('Booking Finalized!');
            } else {
                console.log('Save button not found. Screenshotting...');
                await page.screenshot({ path: 'save_not_found.png' });
            }
        } else {
             console.log('No suitable 4:00 PM empty slot found.');
             await page.screenshot({ path: 'no_slot.png' });
        }

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
