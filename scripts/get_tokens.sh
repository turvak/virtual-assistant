#!/bin/bash
export OP_SERVICE_ACCOUNT_TOKEN=$(grep -Po 'OP_SERVICE_ACCOUNT_TOKEN=\K[^[:space:]]+' /root/.openclaw/.env)
op item list --vault "Open Claw VA"
