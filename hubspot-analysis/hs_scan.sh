#!/bin/bash
# HubSpot Deal Lost keyword scanner
# Scans all deals in "Deal Lost" stage for keywords in notes, emails, calls

HS_TOKEN="REDACTED"
STAGE_ID="e57c5c19-f5da-4cfb-9b9a-22e19f757a27"
KEYWORDS="checklist|form|safety|swms|jsa"
REPORT="/root/.openclaw/workspace/hubspot-lost-deals-report.md"
PROGRESS="/root/.openclaw/workspace/hs_scan_progress.txt"

echo "# HubSpot Deal Lost — Keyword Scan Results" > "$REPORT"
echo "Keywords: checklist, form, safety, swms, jsa" >> "$REPORT"
echo "Stage: Deal Lost (NextMinute Pipeline)" >> "$REPORT"
echo "Started: $(date -u)" >> "$REPORT"
echo "" >> "$REPORT"
echo "| Deal Name | Amount | Match Type | Keyword | Excerpt |" >> "$REPORT"
echo "|-----------|--------|------------|---------|---------|" >> "$REPORT"

total=0
matched=0
after=0
page=0

while true; do
  page=$((page+1))
  
  RESPONSE=$(curl -s -X POST "https://api.hubapi.com/crm/v3/objects/deals/search" \
    -H "Authorization: Bearer $HS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"filterGroups\":[{\"filters\":[{\"propertyName\":\"dealstage\",\"operator\":\"EQ\",\"value\":\"$STAGE_ID\"}]}],
      \"properties\":[\"dealname\",\"amount\"],
      \"limit\":100,
      \"after\":$after
    }")

  DEALS=$(echo "$RESPONSE" | jq -c '.results[]')
  COUNT=$(echo "$RESPONSE" | jq '.results | length')
  NEXT=$(echo "$RESPONSE" | jq -r '.paging.next.after // empty')

  if [ -z "$DEALS" ] || [ "$COUNT" -eq 0 ]; then
    break
  fi

  echo "Page $page: processing $COUNT deals (total so far: $total)..." >> "$PROGRESS"

  while IFS= read -r deal; do
    DEAL_ID=$(echo "$deal" | jq -r '.id')
    DEAL_NAME=$(echo "$deal" | jq -r '.properties.dealname // "Unknown"')
    DEAL_AMOUNT=$(echo "$deal" | jq -r '.properties.amount // ""')
    total=$((total+1))

    # Fetch notes associations (batch-friendly: get IDs first)
    for assoc_type in notes emails calls; do
      ASSOC=$(curl -s "https://api.hubapi.com/crm/v3/objects/deals/$DEAL_ID/associations/$assoc_type" \
        -H "Authorization: Bearer $HS_TOKEN")

      IDS=$(echo "$ASSOC" | jq -r '.results[].id // empty' 2>/dev/null)

      for OBJ_ID in $IDS; do
        case $assoc_type in
          notes)  PROPS="hs_note_body" ;;
          emails) PROPS="hs_email_text,hs_email_subject" ;;
          calls)  PROPS="hs_call_body,hs_call_title" ;;
        esac

        OBJ=$(curl -s "https://api.hubapi.com/crm/v3/objects/$assoc_type/$OBJ_ID?properties=$PROPS" \
          -H "Authorization: Bearer $HS_TOKEN")

        TEXT=$(echo "$OBJ" | jq -r '.properties | to_entries[] | .value // empty' 2>/dev/null | tr '\n' ' ')

        if echo "$TEXT" | grep -qiE "$KEYWORDS"; then
          KEYWORD=$(echo "$TEXT" | grep -oiE "$KEYWORDS" | head -1 | tr '[:upper:]' '[:lower:]')
          EXCERPT=$(echo "$TEXT" | grep -oiE ".{0,40}($KEYWORDS).{0,40}" | head -1 | tr '|' ' ')
          AMOUNT_FMT=""
          if [ -n "$DEAL_AMOUNT" ]; then
            AMOUNT_FMT="\$$DEAL_AMOUNT"
          fi
          echo "| $DEAL_NAME | $AMOUNT_FMT | $assoc_type | $keyword | $EXCERPT |" >> "$REPORT"
          matched=$((matched+1))
          echo "  MATCH: $DEAL_NAME [$assoc_type/$KEYWORD]" >> "$PROGRESS"
        fi
      done
    done
  done <<< "$DEALS"

  echo "Progress: $total deals scanned, $matched matches so far" >> "$PROGRESS"

  if [ -z "$NEXT" ]; then
    break
  fi
  after=$NEXT
  
  # Respect rate limits
  sleep 0.5
done

echo "" >> "$REPORT"
echo "---" >> "$REPORT"
echo "Total deals scanned: $total | Matches found: $matched | Completed: $(date -u)" >> "$REPORT"
echo "SCAN COMPLETE: $total deals scanned, $matched matches found" >> "$PROGRESS"
