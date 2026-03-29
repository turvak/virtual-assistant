#!/usr/bin/env bash
set -euo pipefail
cd /root/.openclaw/workspace
# Non-secret identity check
op whoami || true
# Correct 1Password v2 pattern: set env to secret refs, then run via `op run --`
NEXTMINUTE_EMAIL="op://Open Claw VA/ahc2lz6ad2ttojr3yzoo2prtv4/username" \
NEXTMINUTE_PASSWORD="op://Open Claw VA/ahc2lz6ad2ttojr3yzoo2prtv4/password" \
op run -- node /root/.openclaw/workspace/scripts/nextminute-joblist.js
