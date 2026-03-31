const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('--- Step 1: Login ---');
    await page.goto('https://www.18holes.co.nz/Identity/Account/Login');
    await page.fill('#Input_Email', 'marcnturner@gmail.com');
    await page.fill('#Input_Password', '+2doublebogie');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('--- Step 2: Check My Bookings / Dashboard ---');
    await page.goto('https://www.18holes.co.nz/Booking/MyBookings');
    await page.waitForTimeout(3000);
    let bodyText = await page.innerText('body');
    if (bodyText.includes('01/04/2026') || bodyText.includes('1 April 2026')) {
        console.log('Booking found in My Bookings.');
    } else {
        console.log('Booking NOT found in My Bookings.');
    }

    console.log('--- Step 3: Navigate to RNZAF 1 April 2026 ---');
    // We'll try common IDs again but also search the DOM
    await page.goto('https://www.18holes.co.nz/Booking/TeeBooking/Club/276?date=2026-04-01');
    await page.waitForTimeout(3000);
    
    if (!(await page.innerText('body')).includes('RNZAF')) {
       await page.goto('https://www.18holes.co.nz/Booking/TeeBooking?date=2026-04-01');
       await page.waitForTimeout(3000);
       const rnzafLink = page.locator('a:has-text("RNZAF"), a:has-text("Whenuapai")').first();
       if (await rnzafLink.isVisible()) {
           await rnzafLink.click();
           await page.waitForTimeout(3000);
       }
    }

    console.log('--- Step 4: Identify Slot near 16:00 and Click BOOK ---');
    const slots = await page.$$eval('tr, .tee-time-row, .slot', rows => {
      return rows.map(r => {
        const t = r.innerText.match(/(\d{1,2}:\d{2})/);
        const b = r.querySelector('button:has-text("BOOK"), a:has-text("BOOK"), .btn-book');
        return { time: t ? t[0] : null, bookable: !!b };
      }).filter(s => s.time && s.bookable);
    });

    if (slots.length > 0) {
        const target = 16 * 60;
        let chosen = slots[0]; let minDiff = 10000;
        for (const s of slots) {
            const [h, m] = s.time.split(':').map(Number);
            const diff = Math.abs((h * 60 + m) - target);
            if (diff < minDiff) { minDiff = diff; chosen = s; }
        }
        console.log(`Booking for ${chosen.time}...`);
        const cell = page.locator(`tr:has-text("${chosen.time}"), .tee-time-row:has-text("${chosen.time}"), .slot:has-text("${chosen.time}")`).filter({ has: page.locator('button:has-text("BOOK"), a:has-text("BOOK")') }).first();
        await cell.locator('button:has-text("BOOK"), a:has-text("BOOK")').click();
        await page.waitForTimeout(4000);

        console.log('--- Step 5: Name Selection ---');
        const marcCheckbox = page.locator('label:has-text("Marc Turner"), tr:has-text("Marc Turner")').locator('input[type="checkbox"]').first();
        if (await marcCheckbox.isVisible()) {
            await marcCheckbox.check();
            console.log('Marc Turner checked.');
        } else {
            console.log('Marc Turner checkbox not found. Text present: ' + (await page.innerText('body')).substring(0, 500));
            // Try fallback checkbox
            await page.locator('input[type="checkbox"]').first().check().catch(() => {});
        }

        console.log('--- Step 6: Click SAVE SELECTION ---');
        const saveBtn = page.locator('button:has-text("SAVE SELECTION"), button:has-text("SAVE"), .btn-save').first();
        if (await saveBtn.isVisible()) {
            await saveBtn.click();
            console.log('Clicked SAVE SELECTION.');
            await page.waitForTimeout(5000);
            
            // Re-click if still visible (handle slow state updates)
            if (await saveBtn.isVisible()) {
                console.log('Save button still visible, clicking again...');
                await saveBtn.click();
                await page.waitForTimeout(5000);
            }
        }

        console.log('--- Step 7: Final Verification in Top Calendar ---');
        await page.goto('https://www.18holes.co.nz/Booking/TeeBooking?date=2026-04-01');
        await page.waitForTimeout(4000);
        const finalBody = await page.innerText('body');
        
        // Scraping Top Navigation / Summary area specifically
        const summary = await page.locator('.booking-summary, .my-bookings-summary, #top-nav-bookings').innerText().catch(() => "Summary element not found");
        console.log('Top Level Summary Text:', summary);

        if (finalBody.includes('Marc Turner')) {
            console.log(`SUCCESS: Marc Turner found on page for 1 April.`);
        } else {
            console.log('FAILURE: Booking not appearing in summary.');
            await page.screenshot({ path: 'verification_failed.png' });
        }
    } else {
        console.log('No BOOK buttons available.');
        await page.screenshot({ path: 'no_slots_found.png' });
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
