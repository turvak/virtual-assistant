# Project: Ahiko

## Overview
Large-scale integration project for Ahiko involving n8n, Auth0, Twilio, and automated file processing.

## Tech Stack
- **Automation:** n8n (`https://workflow.nextminute.com/`)
- **Identity:** Auth0
- **Communication:** Twilio (WhatsApp/SMS)
- **CRM:** HubSpot (referenced in related workflows)

## Key Components
### n8n Workflows
- **Ahiko Process File** (`M73-b_pS3DpxTcbdjLPjj`): 
    - Handles "Customer" creation via Auth0 Management API.
    - Creates "Properties" in the Ahiko system.
    - Downloads media files (Twilio URLs).
    - Converts files to Base64 for processing.
    - Creates and attaches "Usage Snapshots" to properties.
    - Triggers comparison reports.

## Connectivity
- **Primary API Key:** `n8n Nextminute/Ahiko` (1Password)
- **Primary URL:** `https://workflow.nextminute.com/`

---
*Created 2026-04-08*
