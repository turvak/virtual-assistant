const { chromium } = require('playwright');
(async () => {
  const email = process.env.NEXTMINUTE_EMAIL || process.env.NEXTMINUTE_USERNAME || process.env.NEXTMINUTE_USER || process.env.NEXTMINUTE_LOGIN || process.env.EMAIL;
  const password = process.env.NEXTMINUTE_PASSWORD || process.env.PASSWORD;
  if (!email || !password) {
    console.error('Missing NEXTMINUTE_EMAIL (or fallback) or NEXTMINUTE_PASSWORD');
    process.exit(2);
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Navigate with multiple fallbacks and allow SPA to settle
  const targets = [
    'https://app.nextminute.com/#/login',
    'https://app.nextminute.com/#/signin',
    'https://app.nextminute.com/#/views/login.html',
    'https://app.nextminute.com/#views/login.html',
    'https://app.nextminute.com/'
  ];
  let loaded = false;
  for (const url of targets) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{});
      loaded = true; break;
    } catch (_) {}
  }
  if (!loaded) {
    await page.screenshot({ path: '/tmp/nextminute-jobs-error.png' });
    throw new Error('Unable to load NextMinute app');
  }

  // Helper to probe both main frame and iframes
  async function findFirstInFrames(selectors) {
    const frames = [page.mainFrame(), ...page.frames()];
    for (const f of frames) {
      for (const s of selectors) {
        const el = await f.$(s);
        if (el) return { frame: f, selector: s };
      }
    }
    return null;
  }

  const emailSelectors = [
    'input[type="email"]', 'input[name="email"]', '#email', 'input#Email', 'input[name="Email"]',
    'input[placeholder*="Email" i]', 'input[placeholder*="email" i]'
  ];
  const passSelectors = [
    'input[type="password"]', 'input[name="password"]', '#password', 'input#Password', 'input[name="Password"]',
    'input[placeholder*="Password" i]'
  ];

  // Wait up to 30s for login controls to appear
  const start = Date.now();
  let emailSelInfo = null, passSelInfo = null;
  while (Date.now() - start < 30000 && (!emailSelInfo || !passSelInfo)) {
    emailSelInfo = emailSelInfo || await findFirstInFrames(emailSelectors);
    passSelInfo = passSelInfo || await findFirstInFrames(passSelectors);
    if (!emailSelInfo || !passSelInfo) await page.waitForTimeout(1000);
  }

  if (!emailSelInfo || !passSelInfo) {
    await page.screenshot({ path: '/tmp/nextminute-jobs-error.png' });
    throw new Error('Login form selectors not found');
  }

  await emailSelInfo.frame.fill(emailSelInfo.selector, email);
  await passSelInfo.frame.fill(passSelInfo.selector, password);

  // Try to submit the form
  const submitCandidates = [
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("Log in")', 'button:has-text("Login")', 'text=Log in', 'text=Login'
  ];
  let submitted = false;
  for (const s of submitCandidates) {
    const el = await emailSelInfo.frame.$(s) || await passSelInfo.frame.$(s) || await page.$(s);
    if (el) { await el.click().catch(()=>{}); submitted = true; break; }
  }
  if (!submitted) await page.keyboard.press('Enter').catch(()=>{});

  // Wait for possible navigation / authenticated state
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(4000);

  // Try to get to Jobs list
  const jobsSelectors = ['a:has-text("Jobs")', 'button:has-text("Jobs")', '[role="link"]:has-text("Jobs")'];
  let jobsLink = null;
  for (const s of jobsSelectors) {
    jobsLink = jobsLink || await page.$(s);
    if (jobsLink) break;
  }
  if (jobsLink) {
    await jobsLink.click().catch(()=>{});
    await page.waitForTimeout(2500);
  } else {
    await page.goto('https://app.nextminute.com/#/jobs', { waitUntil: 'domcontentloaded' }).catch(()=>{});
    await page.waitForTimeout(1500);
  }

  // Final screenshot
  await page.screenshot({ path: '/tmp/nextminute-jobs.png', fullPage: false });
  await browser.close();
  console.log('Saved /tmp/nextminute-jobs.png');
})().catch(async (e) => {
  console.error('ERROR:', e && e.message ? e.message : String(e));
  process.exit(1);
});

