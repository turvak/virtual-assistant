const { chromium } = require('playwright-core');

(async () => {
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: '/usr/bin/google-chrome-stable',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] 
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Navigating to login page...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'load', timeout: 30000 });

        console.log('Logging in...');
        // Correcting based on standard .NET Identity forms
        await page.locator('input[name="Input.Email"]').fill('marcnturner@gmail.com');
        await page.locator('input[name="Input.Password"]').fill('+2doublebogie');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);

        console.log('Navigating to Tee Bookings (direct date)...');
        // If this URL is wrong, we would need to manually navigate
        await page.goto('https://www.18holes.co.nz/TeeBookings/Index?date=2026-04-01', { waitUntil: 'load', timeout: 30000 });

        console.log('Scanning rows for 16:00 (4:00 PM)...');
        // Most booking systems use tables or div-based lists
        const rows = await page.locator('tr').all();
        let targetSlot = null;
        let minDiff = Infinity;
        const targetTimeMin = 16 * 60; // 4:00 PM

        for (const row of rows) {
            const text = await row.innerText();
            const timeMatch = text.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
            const bookButton = row.locator('a, button').filter({ hasText: /^Book$/i });

            if (timeMatch && (await bookButton.count()) > 0) {
                let hour = parseInt(timeMatch[1]);
                const minute = parseInt(timeMatch[2]);
                const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

                if (period === 'PM' && hour < 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
                
                const slotMinutes = hour * 60 + minute;
                const diff = Math.abs(slotMinutes - targetTimeMin);

                // Check if players are already assigned. 
                // Typically, if only 1 player is booked, "Book" might still appear for other slots.
                // User said: "closest to 4:00 PM that has NO other players in it."
                // Check for names or occupied markers.
                const occupied = (text.match(/Confirmed|Player|Reserved|Name/gi) || []).length > 2; // Rough heuristic

                if (!occupied && diff < minDiff) {
                    minDiff = diff;
                    targetSlot = bookButton;
                    console.log(`Found candidate at ${timeMatch[0]} (Diff: ${diff})`);
                }
            }
        }

        if (targetSlot) {
            console.log('Clicking the "Book" button...');
            await targetSlot.click();
            await page.waitForTimeout(3000);

            console.log('Adding James Lee...');
            // Player selection might be multiple inputs or one search box.
            const searchInputs = await page.locator('input[type="text"]').all();
            for (const input of searchInputs) {
                const placeholder = await input.getAttribute('placeholder') || '';
                if (placeholder.toLowerCase().includes('search')) {
                    await input.fill('James Lee');
                    await page.waitForTimeout(1000);
                    await page.keyboard.press('ArrowDown');
                    await page.keyboard.press('Enter');
                    break;
                }
            }

            console.log('Saving Selection...');
            // Look for "Save Selection", "Book Now", "Confirm"
            const saveBtn = page.locator('button, a').filter({ hasText: /Save Selection|Book Now|Confirm/i }).first();
            if (await saveBtn.isVisible()) {
                await saveBtn.click();
                await page.waitForTimeout(3000);
                console.log('Booking completed.');
            } else {
                console.log('Save button not found. Taking screenshot.');
                await page.screenshot({ path: 'not_found.png' });
            }
        } else {
             console.log('No empty slot found near 16:00 on 2026-04-01.');
             await page.screenshot({ path: 'no_slots.png' });
        }

    } catch (err) {
        console.error('Task failed:', err);
    } finally {
        if (browser) await browser.close();
    }
})();
