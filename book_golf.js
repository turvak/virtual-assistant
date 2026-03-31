const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('https://www.18holes.co.nz/Identity/Account/Login');

    console.log('Logging in...');
    await page.fill('#Input_Email', 'marcnturner@gmail.com');
    await page.fill('#Input_Password', '+2doublebogie');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    console.log('Navigating to Tee Bookings...');
    // We need to find the RNZAF club. Usually, after login, there's a dashboard or a way to select the club.
    // Documentation or prior knowledge of 18holes.co.nz suggests navigating to the club's specific booking page.
    // Let's try to find a link to "Tee Bookings" or search for RNZAF.
    // Often it is: https://www.18holes.co.nz/Booking/TeeBooking/Club/276 (RNZAF ID is often 276 or similar)
    // Let's search the page for RNZAF or Tee Bookings.
    
    await page.goto('https://www.18holes.co.nz/Booking/TeeBooking');
    
    // Select Wednesday, 1 April 2026.
    console.log('Selecting date: 2026-04-01');
    // The date picker usually has an ID or we can manipulate the URL.
    // URL format is often /Booking/TeeBooking?date=2026-04-01
    await page.goto('https://www.18holes.co.nz/Booking/TeeBooking?date=2026-04-01');
    await page.waitForLoadState('networkidle');

    console.log('Checking for existing bookings for Marc Turner...');
    // Check "My Bookings" or active bookings bar.
    const myBookings = await page.locator('.my-bookings, .active-bookings, #myBookings').innerText().catch(() => '');
    if (myBookings.includes('Marc Turner') || myBookings.includes('1 April')) {
       console.log('Booking already exists: ' + myBookings);
       // Check if it's actually for the 1st of April.
    }

    // If no booking, look for 4:00 PM (16:00)
    console.log('Searching for slots near 16:00...');
    const slots = await page.$$eval('.tee-time-row', rows => {
        return rows.map(row => {
            const time = row.querySelector('.time')?.innerText;
            const available = row.querySelector('.available-slot, .book-button') !== null;
            return { time, available };
        });
    });

    const targetTime = '16:00';
    // Logic to find closest slot...
    
    // For now, let's just dump the page content or take a screenshot if unsure.
    await page.screenshot({ path: 'golf_booking_debug.png' });
    console.log('Screenshot saved for debugging.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
