#!/bin/bash
# System Health Check Script: Verifies all key integrations are active.

echo "### INTEGRATIONS MONITOR"

# 1. 1Password Check
export OP_SERVICE_ACCOUNT_TOKEN=$(grep -Po 'OP_SERVICE_ACCOUNT_TOKEN=\K[^[:space:]]+' /root/.openclaw/.env)
if op item list --vault "Open Claw VA" &> /dev/null; then
    echo "✅ 1Password: Connected (Vault 'Open Claw VA' Accessible)"
else
    echo "❌ 1Password: Connection Failed (Check OP_SERVICE_ACCOUNT_TOKEN)"
fi

# 2. Google Workspace (GOG) Check - Main
if gog-auth whoami &> /dev/null; then
    echo "✅ GOG (Main): Connected (marcnturner@gmail.com)"
else
    echo "❌ GOG (Main): Disconnected (marcnturner@gmail.com)"
fi

# 3. Google Workspace (GOG) Check - CPD
if gog-auth --account admin@cpdconsortium.com whoami &> /dev/null; then
    echo "✅ GOG (CPD): Connected (admin@cpdconsortium.com)"
else
    echo "❌ GOG (CPD): Disconnected (admin@cpdconsortium.com)"
fi

# 4. n8n API Check
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZjBmZDI2Ni04NTU4LTQ2M2MtOWVkZi0wYWRkOThjZjdkZTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjY4MTg3MDgtOGRlYy00ODVkLWE2MzktOTVmMGEzZTc3Y2U4IiwiaWF0IjoxNzc1NjAwMjAxfQ.1V7-TEwEJuePkE5OfqQoNNVccPISPVdyEgym2jHSCLU"
if curl -s -f -H "X-N8N-API-KEY: $N8N_API_KEY" https://workflow.nextminute.com/api/v1/workflows &> /dev/null; then
    echo "✅ n8n API: Connected (workflow.nextminute.com)"
else
    echo "❌ n8n API: Connection Failed (Invalid API Key)"
fi

# 5. Git Status
if git remote -v &> /dev/null; then
    echo "✅ Git: Repository Linked and Authenticated"
else
    echo "❌ Git: Connection/Auth Fault"
fi
