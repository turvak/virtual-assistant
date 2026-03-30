#!/bin/bash
# HubSpot Lost Deals Keyword Scanner v2 - Parallel Edition
set -uo pipefail

TOKEN="REDACTED"
BASE="https://api.hubapi.com"
OUTPUT="/root/.openclaw/workspace/hubspot-lost-deals-report.md"
KEYWORDS="checklist|form|safety|swms|jsa"
STAGE_ID="e57c5c19-f5da-4cfb-9b9a-22e19f757a27"
STAGE_LABEL="Deal Lost"
PIPELINE_LABEL="NextMinute Pipeline"
PARALLEL=8  # concurrent curl processes

WORKDIR="/tmp/hs_scan_$$"
mkdir -p "$WORKDIR"
LOG="$WORKDIR/scan.log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== HubSpot Lost Deals Keyword Scan v2 ==="
log "Stage: $STAGE_LABEL (ID: $STAGE_ID)"

# ─── Step 1: Fetch all deal IDs ────────────────────────────────────────────
log "Fetching all deals in '$STAGE_LABEL'..."

DEALS_FILE="$WORKDIR/deals.tsv"
> "$DEALS_FILE"

AFTER=""
PAGE=0
TOTAL=0

while true; do
  PAGE=$((PAGE + 1))
  
  if [ -z "$AFTER" ]; then
    AFTER_PARAM="0"
  else
    AFTER_PARAM="$AFTER"
  fi

  RESPONSE=$(curl -s -X POST "$BASE/crm/v3/objects/deals/search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"filterGroups\": [{\"filters\": [{\"propertyName\": \"dealstage\", \"operator\": \"EQ\", \"value\": \"$STAGE_ID\"}]}],
      \"properties\": [\"dealname\", \"amount\"],
      \"limit\": 100,
      \"after\": $AFTER_PARAM
    }")

  COUNT=$(echo "$RESPONSE" | jq '.results | length')
  TOTAL=$((TOTAL + COUNT))
  
  # Append to deals file: id TAB name TAB amount
  echo "$RESPONSE" | jq -r '.results[] | [.id, (.properties.dealname // "Unknown"), (.properties.amount // "")] | @tsv' >> "$DEALS_FILE"
  
  log "  Page $PAGE: $COUNT deals (total: $TOTAL)"

  NEXT_AFTER=$(echo "$RESPONSE" | jq -r '.paging.next.after // empty')
  if [ -z "$NEXT_AFTER" ]; then
    break
  fi
  AFTER="$NEXT_AFTER"
  
  # Small rate limit pause every 10 pages
  if [ $((PAGE % 10)) -eq 0 ]; then
    sleep 0.5
  fi
done

log "Total deals: $TOTAL"

# ─── Step 2: Process each deal with parallel workers ───────────────────────
log "Starting parallel association scan (${PARALLEL} workers)..."

RESULTS_DIR="$WORKDIR/results"
mkdir -p "$RESULTS_DIR"

PROCESSED_FILE="$WORKDIR/processed.count"
echo "0" > "$PROCESSED_FILE"

process_deal() {
  local DEAL_ID="$1"
  local DEAL_NAME="$2"
  local DEAL_AMOUNT="$3"
  local TOKEN="$4"
  local BASE="$5"
  local RESULTS_DIR="$6"
  local KEYWORDS="$7"
  local RESULT_FILE="$RESULTS_DIR/${DEAL_ID}.txt"

  # Fetch all three association types (skip if error)
  NOTE_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/notes" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)
  EMAIL_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/emails" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)
  CALL_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/calls" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)

  # Skip if no associations
  if [ -z "$NOTE_IDS" ] && [ -z "$EMAIL_IDS" ] && [ -z "$CALL_IDS" ]; then
    return 0
  fi

  # Check notes
  for NOTE_ID in $NOTE_IDS; do
    BODY=$(curl -sf "$BASE/crm/v3/objects/notes/$NOTE_ID?properties=hs_note_body" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.properties.hs_note_body // ""' 2>/dev/null || true)
    [ -z "$BODY" ] && continue
    
    if echo "$BODY" | grep -qiE "$KEYWORDS"; then
      KW=$(echo "$BODY" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | paste -sd, -)
      EXCERPT=$(echo "$BODY" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1 | tr '\n\t' '  ')
      printf "%s\t%s\t%s\tnote\t%s\t%s\t%s\n" "$DEAL_ID" "$DEAL_NAME" "$DEAL_AMOUNT" "$NOTE_ID" "$KW" "$EXCERPT" >> "$RESULT_FILE"
    fi
  done

  # Check emails
  for EMAIL_ID in $EMAIL_IDS; do
    EMAIL_DATA=$(curl -sf "$BASE/crm/v3/objects/emails/$EMAIL_ID?properties=hs_email_text,hs_email_subject" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || true)
    [ -z "$EMAIL_DATA" ] && continue
    SUBJ=$(echo "$EMAIL_DATA" | jq -r '.properties.hs_email_subject // ""' 2>/dev/null || true)
    BODY=$(echo "$EMAIL_DATA" | jq -r '.properties.hs_email_text // ""' 2>/dev/null || true)
    COMBINED="$SUBJ $BODY"
    
    if echo "$COMBINED" | grep -qiE "$KEYWORDS"; then
      KW=$(echo "$COMBINED" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | paste -sd, -)
      EXCERPT=$(echo "$COMBINED" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1 | tr '\n\t' '  ')
      printf "%s\t%s\t%s\temail\t%s\t%s\t%s\n" "$DEAL_ID" "$DEAL_NAME" "$DEAL_AMOUNT" "$EMAIL_ID" "$KW" "$EXCERPT" >> "$RESULT_FILE"
    fi
  done

  # Check calls
  for CALL_ID in $CALL_IDS; do
    CALL_DATA=$(curl -sf "$BASE/crm/v3/objects/calls/$CALL_ID?properties=hs_call_body,hs_call_title" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || true)
    [ -z "$CALL_DATA" ] && continue
    TITLE=$(echo "$CALL_DATA" | jq -r '.properties.hs_call_title // ""' 2>/dev/null || true)
    BODY=$(echo "$CALL_DATA" | jq -r '.properties.hs_call_body // ""' 2>/dev/null || true)
    COMBINED="$TITLE $BODY"
    
    if echo "$COMBINED" | grep -qiE "$KEYWORDS"; then
      KW=$(echo "$COMBINED" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | paste -sd, -)
      EXCERPT=$(echo "$COMBINED" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1 | tr '\n\t' '  ')
      printf "%s\t%s\t%s\tcall\t%s\t%s\t%s\n" "$DEAL_ID" "$DEAL_NAME" "$DEAL_AMOUNT" "$CALL_ID" "$KW" "$EXCERPT" >> "$RESULT_FILE"
    fi
  done
}

export -f process_deal

# Use GNU parallel or xargs for parallel execution
DEAL_COUNT=$(wc -l < "$DEALS_FILE")
log "Processing $DEAL_COUNT deals with $PARALLEL parallel workers..."

# Create a script for each deal that calls the function
PROC_COUNT=0
ACTIVE_PIDS=()

while IFS=$'\t' read -r DEAL_ID DEAL_NAME DEAL_AMOUNT; do
  PROC_COUNT=$((PROC_COUNT + 1))
  
  # Launch in background
  process_deal "$DEAL_ID" "$DEAL_NAME" "$DEAL_AMOUNT" "$TOKEN" "$BASE" "$RESULTS_DIR" "$KEYWORDS" &
  ACTIVE_PIDS+=($!)
  
  # Throttle to PARALLEL concurrent jobs
  while [ ${#ACTIVE_PIDS[@]} -ge $PARALLEL ]; do
    NEW_PIDS=()
    for PID in "${ACTIVE_PIDS[@]}"; do
      if kill -0 "$PID" 2>/dev/null; then
        NEW_PIDS+=("$PID")
      fi
    done
    ACTIVE_PIDS=("${NEW_PIDS[@]}")
    if [ ${#ACTIVE_PIDS[@]} -ge $PARALLEL ]; then
      sleep 0.2
    fi
  done
  
  # Progress logging
  if [ $((PROC_COUNT % 100)) -eq 0 ]; then
    MATCH_COUNT=$(find "$RESULTS_DIR" -name "*.txt" -size +0 2>/dev/null | wc -l)
    log "  Progress: $PROC_COUNT/$DEAL_COUNT deals dispatched, $MATCH_COUNT deals with matches so far"
  fi

done < "$DEALS_FILE"

# Wait for all remaining jobs
log "Waiting for remaining jobs to complete..."
wait
log "All workers done."

# ─── Step 3: Compile results ────────────────────────────────────────────────
log "Compiling results..."

RESULTS_COMBINED="$WORKDIR/results_all.tsv"
cat "$RESULTS_DIR"/*.txt 2>/dev/null > "$RESULTS_COMBINED" || true

MATCH_COUNT=0
if [ -f "$RESULTS_COMBINED" ]; then
  MATCH_COUNT=$(wc -l < "$RESULTS_COMBINED")
fi

DEAL_MATCH_COUNT=$(find "$RESULTS_DIR" -name "*.txt" -size +0 2>/dev/null | wc -l)

log "Results: $DEAL_MATCH_COUNT deals matched, $MATCH_COUNT total entries"

# ─── Step 4: Generate markdown report ───────────────────────────────────────
log "Writing report to $OUTPUT..."

{
  echo "# HubSpot Lost Deals — Keyword Scan Report"
  echo ""
  echo "**Pipeline:** $PIPELINE_LABEL"
  echo "**Stage:** $STAGE_LABEL"
  echo "**Keywords scanned:** checklist, form, safety, swms, jsa"
  echo "**Deals scanned:** $DEAL_COUNT"
  echo "**Deals with matches:** $DEAL_MATCH_COUNT"
  echo "**Total match entries:** $MATCH_COUNT"
  echo "**Generated:** $(date)"
  echo ""
  echo "---"
  echo ""
} > "$OUTPUT"

if [ "$MATCH_COUNT" -eq 0 ]; then
  echo "## No matches found" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "None of the $DEAL_COUNT lost deals contained mentions of: checklist, form, safety, swms, jsa" >> "$OUTPUT"
else
  echo "## Matches by Deal" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  PREV_DEAL_ID=""
  while IFS=$'\t' read -r DEAL_ID DEAL_NAME DEAL_AMOUNT TYPE OBJ_ID KW EXCERPT; do
    if [ "$DEAL_ID" != "$PREV_DEAL_ID" ]; then
      echo "" >> "$OUTPUT"
      if [ -n "$DEAL_AMOUNT" ] && [ "$DEAL_AMOUNT" != "null" ]; then
        AMT_FMT="\$$DEAL_AMOUNT"
      else
        AMT_FMT="N/A"
      fi
      echo "### $DEAL_NAME" >> "$OUTPUT"
      echo "**Amount:** $AMT_FMT | **Deal ID:** \`$DEAL_ID\`" >> "$OUTPUT"
      echo "" >> "$OUTPUT"
      PREV_DEAL_ID="$DEAL_ID"
    fi
    echo "- **[$TYPE]** Keywords: \`$KW\`" >> "$OUTPUT"
    echo "  > …${EXCERPT}…" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  done < <(sort -t$'\t' -k2,2 "$RESULTS_COMBINED")

  echo "" >> "$OUTPUT"
  echo "---" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "### Keyword Frequency" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "| Keyword | Count |" >> "$OUTPUT"
  echo "|---------|-------|" >> "$OUTPUT"
  for KW in checklist form safety swms jsa; do
    COUNT=$(grep -ic "$KW" "$RESULTS_COMBINED" 2>/dev/null || echo 0)
    echo "| $KW | $COUNT |" >> "$OUTPUT"
  done
fi

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "_Scan log: \`$LOG\`_" >> "$OUTPUT"

log "=== COMPLETE ==="
log "Report: $OUTPUT"
log "Deals scanned: $DEAL_COUNT"
log "Matches: $DEAL_MATCH_COUNT deals / $MATCH_COUNT entries"

# Print summary to stdout for capture
echo ""
echo "SCAN_COMPLETE"
echo "DEALS_SCANNED=$DEAL_COUNT"
echo "DEALS_MATCHED=$DEAL_MATCH_COUNT"
echo "ENTRIES_MATCHED=$MATCH_COUNT"
echo "REPORT=$OUTPUT"
