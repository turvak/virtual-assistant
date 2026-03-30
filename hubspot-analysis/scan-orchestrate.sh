#!/bin/bash
# Orchestrator: splits deals.tsv and runs parallel workers
# Usage: scan-orchestrate.sh <deals_file> <results_dir> <workers>

DEALS_FILE="$1"
RESULTS_DIR="$2"
WORKERS="${3:-8}"
TOKEN="REDACTED"
BASE="https://api.hubapi.com"
KEYWORDS="checklist|form|safety|swms|jsa"
WORKER_SCRIPT="/root/.openclaw/workspace/scan-deals-worker.sh"

mkdir -p "$RESULTS_DIR"

DEAL_COUNT=$(wc -l < "$DEALS_FILE")
echo "[$(date '+%H:%M:%S')] Starting parallel scan: $DEAL_COUNT deals, $WORKERS workers"

# Split into chunks
CHUNK_SIZE=$(( (DEAL_COUNT + WORKERS - 1) / WORKERS ))
SPLIT_DIR="/tmp/deal_chunks_$$"
mkdir -p "$SPLIT_DIR"

split -l "$CHUNK_SIZE" "$DEALS_FILE" "$SPLIT_DIR/chunk_"
CHUNKS=$(ls "$SPLIT_DIR"/chunk_* | wc -l)
echo "[$(date '+%H:%M:%S')] Split into $CHUNKS chunks of ~$CHUNK_SIZE deals each"

# Launch workers
PIDS=()
i=0
for CHUNK in "$SPLIT_DIR"/chunk_*; do
  i=$((i+1))
  echo "[$(date '+%H:%M:%S')] Launching worker $i on chunk: $(wc -l < "$CHUNK") deals"
  bash "$WORKER_SCRIPT" "$TOKEN" "$BASE" "$RESULTS_DIR" "$KEYWORDS" < "$CHUNK" &
  PIDS+=($!)
done

echo "[$(date '+%H:%M:%S')] All $i workers launched. Waiting..."

# Progress monitoring
DONE_COUNT=0
while [ $DONE_COUNT -lt ${#PIDS[@]} ]; do
  sleep 30
  DONE_COUNT=0
  for PID in "${PIDS[@]}"; do
    kill -0 "$PID" 2>/dev/null || DONE_COUNT=$((DONE_COUNT + 1))
  done
  MATCH_FILES=$(find "$RESULTS_DIR" -name "*.txt" -size +0 2>/dev/null | wc -l)
  echo "[$(date '+%H:%M:%S')] Workers done: $DONE_COUNT/${#PIDS[@]}, deals matched so far: $MATCH_FILES"
done

# Wait for all
wait
echo "[$(date '+%H:%M:%S')] All workers complete"

MATCH_COUNT=$(find "$RESULTS_DIR" -name "*.txt" -size +0 2>/dev/null | wc -l)
ENTRY_COUNT=$(cat "$RESULTS_DIR"/*.txt 2>/dev/null | wc -l || echo 0)
echo "[$(date '+%H:%M:%S')] Final: $MATCH_COUNT deals matched, $ENTRY_COUNT total entries"

# Cleanup chunks
rm -rf "$SPLIT_DIR"
