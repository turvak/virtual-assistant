#!/bin/bash
set -euo pipefail

TOKEN="REDACTED"
BASE="https://api.hubapi.com"
OUTPUT="/root/.openclaw/workspace/hubspot-lost-deals-report.md"
KEYWORDS="checklist|form|safety|swms|jsa"

echo "=== HubSpot Lost Deals Keyword Scan ===" | tee /tmp/scan.log
echo "Started: $(date)" | tee -a /tmp/scan.log

# Step 1: Get pipelines and find the "Deal Lost" stage in NextMinute Pipeline
echo ""
echo "Fetching deal pipelines..." | tee -a /tmp/scan.log
PIPELINES=$(curl -s "$BASE/crm/v3/pipelines/deals" \
  -H "Authorization: Bearer $TOKEN")

echo "$PIPELINES" | jq -r '.results[] | "\(.id) \(.label)"' | tee -a /tmp/scan.log

# Find NextMinute Pipeline
NM_PIPELINE=$(echo "$PIPELINES" | jq -r '.results[] | select(.label | test("NextMinute"; "i"))')
if [ -z "$NM_PIPELINE" ]; then
  echo "ERROR: Could not find NextMinute Pipeline" | tee -a /tmp/scan.log
  # List all pipelines for debugging
  echo "$PIPELINES" | jq '.'
  exit 1
fi

PIPELINE_ID=$(echo "$NM_PIPELINE" | jq -r '.id')
PIPELINE_LABEL=$(echo "$NM_PIPELINE" | jq -r '.label')
echo "Found pipeline: $PIPELINE_LABEL (ID: $PIPELINE_ID)" | tee -a /tmp/scan.log

# Find Deal Lost stage
STAGE_ID=$(echo "$NM_PIPELINE" | jq -r '.stages[] | select(.label | test("Deal Lost"; "i")) | .id')
STAGE_LABEL=$(echo "$NM_PIPELINE" | jq -r '.stages[] | select(.label | test("Deal Lost"; "i")) | .label')

if [ -z "$STAGE_ID" ]; then
  echo "ERROR: Could not find Deal Lost stage. Available stages:" | tee -a /tmp/scan.log
  echo "$NM_PIPELINE" | jq -r '.stages[] | "\(.id) \(.label)"' | tee -a /tmp/scan.log
  exit 1
fi

echo "Found stage: $STAGE_LABEL (ID: $STAGE_ID)" | tee -a /tmp/scan.log

# Step 2: Fetch all deals in that stage with pagination
echo "" | tee -a /tmp/scan.log
echo "Fetching all deals in '$STAGE_LABEL' stage..." | tee -a /tmp/scan.log

DEALS_FILE="/tmp/all_deals.json"
echo "[]" > "$DEALS_FILE"

AFTER=0
PAGE=0
TOTAL=0

while true; do
  PAGE=$((PAGE + 1))
  echo "  Fetching page $PAGE (after=$AFTER)..." | tee -a /tmp/scan.log

  RESPONSE=$(curl -s -X POST "$BASE/crm/v3/objects/deals/search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"filterGroups\": [{
        \"filters\": [{
          \"propertyName\": \"dealstage\",
          \"operator\": \"EQ\",
          \"value\": \"$STAGE_ID\"
        }]
      }],
      \"properties\": [\"dealname\", \"amount\", \"dealstage\"],
      \"limit\": 100,
      \"after\": $AFTER
    }")

  COUNT=$(echo "$RESPONSE" | jq '.results | length')
  TOTAL=$((TOTAL + COUNT))
  echo "  Got $COUNT deals (total so far: $TOTAL)" | tee -a /tmp/scan.log

  # Merge into deals file
  jq --argjson new "$(echo "$RESPONSE" | jq '.results')" '. + $new' "$DEALS_FILE" > /tmp/deals_merge.json
  mv /tmp/deals_merge.json "$DEALS_FILE"

  # Check for next page
  NEXT_AFTER=$(echo "$RESPONSE" | jq -r '.paging.next.after // empty')
  if [ -z "$NEXT_AFTER" ]; then
    break
  fi
  AFTER="$NEXT_AFTER"
done

echo "Total deals found: $TOTAL" | tee -a /tmp/scan.log

# Step 3: For each deal, scan associations
echo "" | tee -a /tmp/scan.log
echo "Scanning deals for keyword matches..." | tee -a /tmp/scan.log

# Prepare results file
RESULTS_FILE="/tmp/scan_results.json"
echo "[]" > "$RESULTS_FILE"

DEAL_COUNT=$(jq 'length' "$DEALS_FILE")
echo "Processing $DEAL_COUNT deals..." | tee -a /tmp/scan.log

# Process deals in batches using jq to extract IDs/names
jq -r '.[] | "\(.id)\t\(.properties.dealname // "Unknown")\t\(.properties.amount // "0")"' "$DEALS_FILE" > /tmp/deal_list.tsv

PROCESSED=0
MATCHED=0

while IFS=$'\t' read -r DEAL_ID DEAL_NAME DEAL_AMOUNT; do
  PROCESSED=$((PROCESSED + 1))
  if [ $((PROCESSED % 50)) -eq 0 ]; then
    echo "  Progress: $PROCESSED/$DEAL_COUNT deals processed, $MATCHED matches found..." | tee -a /tmp/scan.log
  fi

  # Fetch all three association types in parallel
  NOTES_RESP=$(curl -s "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/notes" \
    -H "Authorization: Bearer $TOKEN")
  EMAILS_RESP=$(curl -s "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/emails" \
    -H "Authorization: Bearer $TOKEN")
  CALLS_RESP=$(curl -s "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/calls" \
    -H "Authorization: Bearer $TOKEN")

  NOTE_IDS=$(echo "$NOTES_RESP" | jq -r '.results[].id // empty' 2>/dev/null)
  EMAIL_IDS=$(echo "$EMAILS_RESP" | jq -r '.results[].id // empty' 2>/dev/null)
  CALL_IDS=$(echo "$CALLS_RESP" | jq -r '.results[].id // empty' 2>/dev/null)

  # Skip if no associations
  if [ -z "$NOTE_IDS" ] && [ -z "$EMAIL_IDS" ] && [ -z "$CALL_IDS" ]; then
    continue
  fi

  # Check notes
  for NOTE_ID in $NOTE_IDS; do
    BODY=$(curl -s "$BASE/crm/v3/objects/notes/$NOTE_ID?properties=hs_note_body" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.properties.hs_note_body // ""')
    
    if echo "$BODY" | grep -qiE "$KEYWORDS"; then
      MATCHED_KW=$(echo "$BODY" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' ',' | sed 's/,$//')
      # Get excerpt around first match
      EXCERPT=$(echo "$BODY" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1)
      
      jq --arg deal_id "$DEAL_ID" \
         --arg deal_name "$DEAL_NAME" \
         --arg amount "$DEAL_AMOUNT" \
         --arg type "note" \
         --arg obj_id "$NOTE_ID" \
         --arg keywords "$MATCHED_KW" \
         --arg excerpt "$EXCERPT" \
         '. + [{"deal_id": $deal_id, "deal_name": $deal_name, "amount": $amount, "type": $type, "obj_id": $obj_id, "keywords": $keywords, "excerpt": $excerpt}]' \
         "$RESULTS_FILE" > /tmp/results_merge.json
      mv /tmp/results_merge.json "$RESULTS_FILE"
      MATCHED=$((MATCHED + 1))
    fi
  done

  # Check emails
  for EMAIL_ID in $EMAIL_IDS; do
    EMAIL_DATA=$(curl -s "$BASE/crm/v3/objects/emails/$EMAIL_ID?properties=hs_email_text,hs_email_subject" \
      -H "Authorization: Bearer $TOKEN")
    SUBJECT=$(echo "$EMAIL_DATA" | jq -r '.properties.hs_email_subject // ""')
    BODY=$(echo "$EMAIL_DATA" | jq -r '.properties.hs_email_text // ""')
    COMBINED="$SUBJECT $BODY"
    
    if echo "$COMBINED" | grep -qiE "$KEYWORDS"; then
      MATCHED_KW=$(echo "$COMBINED" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' ',' | sed 's/,$//')
      EXCERPT=$(echo "$COMBINED" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1)
      
      jq --arg deal_id "$DEAL_ID" \
         --arg deal_name "$DEAL_NAME" \
         --arg amount "$DEAL_AMOUNT" \
         --arg type "email" \
         --arg obj_id "$EMAIL_ID" \
         --arg keywords "$MATCHED_KW" \
         --arg excerpt "$EXCERPT" \
         '. + [{"deal_id": $deal_id, "deal_name": $deal_name, "amount": $amount, "type": $type, "obj_id": $obj_id, "keywords": $keywords, "excerpt": $excerpt}]' \
         "$RESULTS_FILE" > /tmp/results_merge.json
      mv /tmp/results_merge.json "$RESULTS_FILE"
      MATCHED=$((MATCHED + 1))
    fi
  done

  # Check calls
  for CALL_ID in $CALL_IDS; do
    CALL_DATA=$(curl -s "$BASE/crm/v3/objects/calls/$CALL_ID?properties=hs_call_body,hs_call_title" \
      -H "Authorization: Bearer $TOKEN")
    TITLE=$(echo "$CALL_DATA" | jq -r '.properties.hs_call_title // ""')
    BODY=$(echo "$CALL_DATA" | jq -r '.properties.hs_call_body // ""')
    COMBINED="$TITLE $BODY"
    
    if echo "$COMBINED" | grep -qiE "$KEYWORDS"; then
      MATCHED_KW=$(echo "$COMBINED" | grep -oiE "$KEYWORDS" | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' ',' | sed 's/,$//')
      EXCERPT=$(echo "$COMBINED" | grep -ioE ".{0,60}(checklist|form|safety|swms|jsa).{0,60}" | head -1)
      
      jq --arg deal_id "$DEAL_ID" \
         --arg deal_name "$DEAL_NAME" \
         --arg amount "$DEAL_AMOUNT" \
         --arg type "call" \
         --arg obj_id "$CALL_ID" \
         --arg keywords "$MATCHED_KW" \
         --arg excerpt "$EXCERPT" \
         '. + [{"deal_id": $deal_id, "deal_name": $deal_name, "amount": $amount, "type": $type, "obj_id": $obj_id, "keywords": $keywords, "excerpt": $excerpt}]' \
         "$RESULTS_FILE" > /tmp/results_merge.json
      mv /tmp/results_merge.json "$RESULTS_FILE"
      MATCHED=$((MATCHED + 1))
    fi
  done

done < /tmp/deal_list.tsv

echo "" | tee -a /tmp/scan.log
echo "Scan complete: $PROCESSED deals processed, $MATCHED keyword matches found" | tee -a /tmp/scan.log

# Step 4: Generate report
echo "" | tee -a /tmp/scan.log
echo "Generating report..." | tee -a /tmp/scan.log

cat > "$OUTPUT" << REPORTHEADER
# HubSpot Lost Deals — Keyword Scan Report

**Pipeline:** NextMinute Pipeline  
**Stage:** $STAGE_LABEL  
**Keywords scanned:** checklist, form, safety, swms, jsa  
**Deals scanned:** $PROCESSED  
**Total matches:** $MATCHED  
**Generated:** $(date)

---

REPORTHEADER

RESULT_COUNT=$(jq 'length' "$RESULTS_FILE")

if [ "$RESULT_COUNT" -eq 0 ]; then
  echo "## No matches found" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "None of the $PROCESSED lost deals contained mentions of the keywords: checklist, form, safety, swms, jsa" >> "$OUTPUT"
else
  echo "## Matches ($RESULT_COUNT)" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  # Group by deal
  PREV_DEAL=""
  while IFS=$'\t' read -r DEAL_ID DEAL_NAME AMOUNT TYPE OBJ_ID KEYWORDS EXCERPT; do
    if [ "$DEAL_ID" != "$PREV_DEAL" ]; then
      echo "" >> "$OUTPUT"
      AMOUNT_FMT=$([ -n "$AMOUNT" ] && [ "$AMOUNT" != "0" ] && [ "$AMOUNT" != "null" ] && echo "\$$AMOUNT" || echo "N/A")
      echo "### $DEAL_NAME" >> "$OUTPUT"
      echo "**Amount:** $AMOUNT_FMT | **Deal ID:** $DEAL_ID" >> "$OUTPUT"
      echo "" >> "$OUTPUT"
      PREV_DEAL="$DEAL_ID"
    fi
    echo "- **[$TYPE]** Keywords: \`$KEYWORDS\`" >> "$OUTPUT"
    echo "  > $EXCERPT" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  done < <(jq -r '.[] | "\(.deal_id)\t\(.deal_name)\t\(.amount)\t\(.type)\t\(.obj_id)\t\(.keywords)\t\(.excerpt)"' "$RESULTS_FILE" | sort -t$'\t' -k1,1)
fi

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "_Report generated by Artie. Raw scan log: /tmp/scan.log_" >> "$OUTPUT"

echo "Report written to $OUTPUT" | tee -a /tmp/scan.log
echo ""
echo "=== SCAN SUMMARY ==="
echo "Deals processed: $PROCESSED"
echo "Keyword matches: $MATCHED"
echo "Report: $OUTPUT"
