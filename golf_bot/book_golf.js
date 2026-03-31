const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('Navigating to login page...');
        await page.goto('https://www.18holes.co.nz/Identity/Account/Login', { waitUntil: 'networkidle2' });

        console.log('Logging in...');
        await page.type('#Input_Email', 'marcnturner@gmail.com');
        await page.type('#Input_Password', '+2doublebogie');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        console.log('Navigating to Tee Bookings for RNZAF...');
        // Let's use the actual RNZAF specific URL or find the booking link.
        // It's likely /Booking/TeeBookings/Club/RNZAF
        await page.goto('https://www.18holes.co.nz/Booking/TeeBookings?clubId=64', { waitUntil: 'networkidle2' }); // RNZAF ID usually 64

        console.log('Checking navigation and Selecting Date: Wednesday, 1 April 2026...');
        await page.goto('https://www.18holes.co.nz/Booking/TeeBookings?clubId=64&date=2026-04-01', { waitUntil: 'networkidle2' });

        console.log('Checking page contents...');
        const pageContent = await page.evaluate(() => document.body.innerText);
        if (pageContent.includes('Select Club') || !pageContent.includes('RNZAF')) {
             console.log('Trying to find RNZAF selection...');
             const rnzafLink = await page.evaluate(() => {
                 const links = Array.from(document.querySelectorAll('a'));
                 const r = links.find(el => el.textContent.includes('RNZAF'));
                 return r ? r.href : null;
             });
             if (rnzafLink) {
                 await page.goto(rnzafLink + '?date=2026-04-01', { waitUntil: 'networkidle2' });
             }
        }

        console.log('Checking "My Bookings" section...');
        const myBookings = await page.evaluate(() => {
            const section = document.querySelector('.my-bookings') || document.querySelector('#my-bookings');
            return section ? section.innerText : 'Not found';
        });
        console.log('My Bookings:', myBookings);

        if (myBookings.includes('No bookings') || myBookings === 'Not found' || !myBookings.includes('Wednesday 1 April')) {
            console.log('No booking found. Searching for slot near 4:00 PM...');
            
            const slotToBook = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('tr.tee-time-row, .booking-row'));
                let bestSlot = null;
                let minDiff = Infinity;
                const targetTime = 16 * 60; // 4:00 PM in minutes

                rows.forEach(row => {
                    const timeText = row.querySelector('.time-cell, .tee-time')?.innerText;
                    if (timeText) {
                        const [time, period] = timeText.split(' ');
                        let [hrs, mins] = time.split(':').map(Number);
                        if (period === 'PM' && hrs !== 12) hrs += 12;
                        if (period === 'AM' && hrs === 12) hrs = 0;
                        const totalMins = hrs * 60 + mins;

                        const diff = Math.abs(totalMins - targetTime);
                        const isAvailable = row.innerText.toLowerCase().includes('book') || row.querySelector('.btn-book');
                        
                        if (isAvailable && diff < minDiff) {
                            minDiff = diff;
                            bestSlot = row.querySelector('.btn-book')?.getAttribute('id') || row.querySelector('a[href*="Book"]')?.href;
                        }
                    }
                });
                return bestSlot;
            });

            if (slotToBook) {
                console.log('Found slot. Clicking BOOK...');
                if (slotToBook.startsWith('http')) {
                    await page.goto(slotToBook, { waitUntil: 'networkidle2' });
                } else {
                    await page.click(`#${slotToBook}`);
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });
                }

                console.log('Selecting Marc Turner...');
                // Checkbox for Marc Turner
                await page.evaluate(() => {
                    const labels = Array.from(document.querySelectorAll('label'));
                    const marcLabel = labels.find(l => l.innerText.includes('Marc Turner'));
                    if (marcLabel) {
                        const checkbox = document.getElementById(marcLabel.getAttribute('for')) || marcLabel.querySelector('input[type="checkbox"]');
                        if (checkbox) checkbox.checked = true;
                    }
                });

                console.log('Clicking SAVE SELECTION...');
                const saveBtn = await page.$('button[type="submit"], .btn-save, #btnSave');
                if (saveBtn) {
                    await Promise.all([
                        saveBtn.click(),
                        page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    ]);
                }

                console.log('Refreshing and confirming...');
                await page.reload({ waitUntil: 'networkidle2' });
                const finalCheck = await page.content();
                if (finalCheck.includes('Marc Turner') && finalCheck.includes('1 April')) {
                    console.log('SUCCESS: Booking confirmed.');
                } else {
                    console.log('FAILURE: Booking not appearing after save.');
                    const bookingAreaHtml = await page.evaluate(() => document.querySelector('.booking-container, #booking-grid')?.outerHTML || document.body.innerHTML);
                    console.log('DEBUG_HTML_START');
                    console.log(bookingAreaHtml);
                    console.log('DEBUG_HTML_END');
                }
        console.log('No available slots found. Capturing body content for debugging...');
        const bodyContent = await page.evaluate(() => document.body.innerText);
        console.log('--- PAGE BODY START ---');
        console.log(bodyContent);
        console.log('--- PAGE BODY END ---');
        
        const bookingGridHtml = await page.evaluate(() => document.querySelector('#booking-grid, .booking-container, table')?.outerHTML || 'No grid found');
        console.log('--- BOOKING GRID HTML START ---');
        console.log(bookingGridHtml);
        console.log('--- BOOKING GRID HTML END ---');
    }
} else {
    console.log('Booking already exists.');
}

    } catch (error) {
        console.error('An error occurred:', error);
        const screenshotPath = 'error_screenshot.png';
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to ${screenshotPath}`);
    } finally {
        await browser.close();
    }
})();
