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
        console.log('Navigating to date 2026-04-01...');
        
        // Try direct date navigation
        await page.goto('https://www.18holes.co.nz/Booking?date=2026-04-01');
        await page.waitForTimeout(5000);
        
        const content = await page.innerText('body');
        if (content.includes('Wednesday') && (content.includes('1 April 2026') || content.includes('01/04/2026'))) {
            console.log('Successfully reached 1 April 2026.');
        } else {
             console.log('Date verification failed. Trying fallback date picker...');
             // Fallback: look for a date input and fill it
             const dateInput = await page.$('input[type="date"]');
             if (dateInput) {
                 await dateInput.fill('2026-04-01');
                 await dateInput.press('Enter');
                 await page.waitForTimeout(3000);
             }
        }

        console.log('Finding slot near 4:00 PM (16:00)...');
        const rows = await page.locator('tr').all();
        let minDiff = Infinity;
        let bestSlotRow = null;
        let timeFound = '';

        for (const row of rows) {
            const txt = await row.innerText();
            const timeMatch = txt.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
            const bookCount = (txt.match(/Book/gi) || []).length;
            const occupies = (txt.match(/\(\d+\.?\d*\)/g) || []).length;

            if (timeMatch && bookCount >= 3 && occupies === 0) {
                let h = parseInt(timeMatch[1]);
                const m = parseInt(timeMatch[2]);
                const p = timeMatch[3];
                if (p === 'PM' && h < 12) h += 12;
                if (p === 'AM' && h === 12) h = 0;
                
                const slotMin = h * 60 + m;
                const diff = Math.abs(slotMin - (16 * 60));
                if (diff < minDiff) {
                    minDiff = diff;
                    bestSlotRow = row;
                    timeFound = timeMatch[0];
                }
            }
        }

        if (bestSlotRow) {
            console.log(`Found best slot at ${timeFound}. Clicking Book...`);
            const bookBtn = await bestSlotRow.$('a:has-text("Book"), button:has-text("Book")');
            if (bookBtn) {
                await bookBtn.click();
                await page.waitForTimeout(5000);
                
                console.log('Nominate James Lee...');
                // The search for James Lee often triggers a dropdown.
                const search = await page.$('input[placeholder*="Search"], input[id*="Nominate"], input[name*="Player"]');
                if (search) {
                     await search.fill('James Lee');
                     await page.waitForTimeout(3000);
                     // Usually the first result is James Lee. 
                     // Clicking the first dropdown item if it exists.
                     await page.keyboard.press('ArrowDown');
                     await page.keyboard.press('Enter');
                     console.log('James Lee selected.');
                }
                
                const save = await page.$('button:has-text("Save Selection"), a:has-text("Save Selection")');
                if (save) {
                    await save.click();
                    await page.waitForTimeout(5000);
                    // Check for confirmation text
                    const finalContent = await page.innerText('body');
                    if (finalContent.includes('successfully') || finalContent.includes('confirmed')) {
                        console.log('Booking confirmed!');
                    } else {
                         console.log('Final check might have failed, but Save was clicked.');
                    }
                } else {
                     console.log('Save button not found!');
                }
            }
        } else {
             console.log('No 4:00 PM empty slot found on 1 April 2026.');
        }

    } catch (err) {
        console.error('Fatal failure:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
