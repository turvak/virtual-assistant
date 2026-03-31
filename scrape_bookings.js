const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

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

    console.log('Navigating to active bookings...');
    const calendarIconSelector = '.far.fa-calendar';
    await page.waitForSelector(calendarIconSelector, { timeout: 10000 });
    
    // Sometimes clicks don't trigger full navigations or use AJAX. 
    // Let's click and wait for network activity instead of strict navigation.
    await page.click(calendarIconSelector);
    await page.waitForNetworkIdle({ idleTime: 1000 });

    console.log('Scanning for bookings...');
    // Scrape the content to see bookings.
    const content = await page.evaluate(() => document.body.innerText);
    console.log('--- PAGE CONTENT START ---');
    console.log(content);
    console.log('--- PAGE CONTENT END ---');

    // Also take a screenshot for debugging if needed (saved to workspace)
    await page.screenshot({ path: 'bookings_screenshot.png', fullPage: true });

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error_screenshot.png' });
  } finally {
    await browser.close();
  }
})();
