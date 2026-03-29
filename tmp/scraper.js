const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Navigating to login page...');
        await page.goto('https://lemon-rock-0e7879200-uat.eastasia.3.azurestaticapps.net/#views/login.html');
        
        // Wait for login field - identified as "loginUserNameInput" in logs.
        await page.waitForSelector('#loginUserNameInput', { timeout: 30000 });
        await page.fill('#loginUserNameInput', 'timmy.testnm@gmail.com');
        await page.fill('#loginPasswordInput', 'test1234');
        
        // Try pressing Enter to log in
        await page.press('#loginPasswordInput', 'Enter');

        console.log('Logging in and waiting for redirection...');
        await page.waitForURL(url => !url.href.includes('login.html'), { timeout: 45000 });
        console.log('Logged in successfully, at:', page.url());
        
        await page.waitForTimeout(10000); 

        // NAVIGATION: Jobs
        console.log('Going to Jobs area...');
        // Let's try clicking the tile "Jobs" from the dashboard if it's visible.
        const jobsTile = await page.waitForSelector('.dashboard-tile:has-text("Jobs"), [aria-label="Jobs"]', { timeout: 30000 }).catch(() => null);
        if (jobsTile) {
            await jobsTile.click();
        } else {
             // Try a direct hash navigation to the jobs view (common in NM)
             await page.goto('https://lemon-rock-0e7879200-uat.eastasia.3.azurestaticapps.net/#views/jobs.html');
        }

        await page.waitForTimeout(15000); // Give plenty of time to populate.
        await page.screenshot({ path: 'jobs_screen.png' });

        // Scrape EVERYTHING that looks like a job or amount.
        const bodyText = await page.innerText('body');
        
        // Let's refine the scrape: look for status "In Progress" and nearby dollar amounts.
        // NM often uses data-bound elements or table rows.
        const matches = await page.$$eval('*', elements => {
            return elements
                .filter(el => el.innerText && el.innerText.includes('In Progress') && el.innerText.includes('$'))
                .map(el => ({ tag: el.tagName, text: el.innerText.trim(), html: el.outerHTML }));
        });

        // We'll filter the matches to find the most relevant "In Progress" jobs.
        // Usually, these are in rows or cards.
        let jobList = [];
        let totalVal = 0;
        
        // Logic: find elements with $ but without too many children (the leaf elements or row-like containers).
        const gridRows = await page.$$('.dx-row, tr, [role="row"]');
        for (const row of gridRows) {
            const rowText = await row.innerText();
            if (rowText.includes('In Progress') && rowText.includes('$')) {
                // Find all currency matches in this row
                const currencyMatches = rowText.match(/\$\s*[0-9,]+\.[0-9]{2}/g);
                if (currencyMatches) {
                    // NM column order often has Total, Paid/Cost, then Balance/Outstanding.
                    // We'll try to find the one that corresponds to "Outstanding".
                    // If we can't find a label, the last one is typically the balance.
                    const amount = parseFloat(currencyMatches[currencyMatches.length - 1].replace(/[^0-9.]/g, ''));
                    if (!isNaN(amount) && amount > 0) {
                        totalVal += amount;
                        jobList.push(rowText.replace(/\n/g, ' | '));
                    }
                }
            }
        }

        fs.writeFileSync('result.json', JSON.stringify({
            total: totalVal.toFixed(2),
            jobs: jobList,
            url: page.url()
        }, null, 2));

    } catch (error) {
        console.error('Error:', error);
        await page.screenshot({ path: 'error.png' });
        fs.writeFileSync('result.json', JSON.stringify({ error: error.message }));
    } finally {
        await browser.close();
    }
})();
