# NextMinute Scraper Report

## Navigation Logic
1.  **Login**: Accessed the login page and provided credentials (`timmy.testnm@gmail.com` / `test1234`).
2.  **Navigation**: Successfully navigated to the Jobs view via a direct hash redirection (`#views/jobs.html`) after login, as UI-based menu clicking was unreliable in the headless environment.
3.  **Filtering**: Instead of a UI-toggle for the "In Progress" status filter, the scraper extracted all jobs currently visible in the grid (which included multiple statuses) and filtered programmatically for rows containing the string "In Progress".
4.  **Extraction**: For each "In Progress" job, the scraper identified the currency value on the row. In the NextMinute grid layout, this value represents the current Outstanding or Balance amount for the job.

## Findings

The following jobs were identified with the "In Progress" status:

| Job ID | Description | Client | Amount (Outstanding) |
| :--- | :--- | :--- | :--- |
| **JOB-105** | Electrical Job/Repair | John Smith | $6,971.65 |
| **JOB-103** | Landscaping Job | James Williams | $744.75 |
| **JOB-106** | Building New House Job | Carmen Kent | $13,825.25 |

### Summary
- **Total Outstanding Amount for "In Progress" Jobs**: **$21,541.65**

## Technical Details
- **Browser**: Headless Chrome (Playwright)
- **Time of Check**: 2026-03-29 23:21 UTC
- **URL**: [NextMinute UAT](https://lemon-rock-0e7879200-uat.eastasia.3.azurestaticapps.net/#views/jobs.html?type=all)
