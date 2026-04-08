# Ahiko Project - Memory & Insights

## Patterns & Insights
- **Authentication:** Ahiko uses Auth0 Management API (`https://api.ahiko.io/customer/v1/customers`).
- **File Flow:** Twilio `mediaUrl` provides raw binaries, which are converted to Base64 in JavaScript before being sent to usage-snapshot endpoints as JSON bodies.
- **n8n Instance:** This project lives on a separate n8n instance from the internal CPD infrastructure (`workflow.nextminute.com` vs `n8n.cpdconsortium.com`).

## Workflow Mechanics
- **Wait States:** The "Ahiko Process File" includes a 10s wait for snapshot processing before polling status—indicating a possible asynchronous API pattern on the platform side.
- **Workflow-to-Workflow:** Highly modular; uses sub-workflow triggers and HTTP request nodes rather than large monolithic flows.

---
*Init 2026-04-08*
