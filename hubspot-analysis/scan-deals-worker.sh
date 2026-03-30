#!/bin/bash
# Worker script: called with DEAL_ID TAB DEAL_NAME TAB DEAL_AMOUNT
# Outputs matching lines to RESULTS_DIR/DEAL_ID.txt

TOKEN="$1"
BASE="$2"
RESULTS_DIR="$3"
KEYWORDS="$4"

while IFS=$'\t' read -r DEAL_ID DEAL_NAME DEAL_AMOUNT; do
  [ -z "$DEAL_ID" ] && continue

  # Fetch all three association types
  NOTE_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/notes" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)
  EMAIL_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/emails" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)
  CALL_IDS=$(curl -sf "$BASE/crm/v3/objects/deals/$DEAL_ID/associations/calls" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.results[].id // empty' 2>/dev/null || true)

  # Skip if no associations
  if [ -z "$NOTE_IDS" ] && [ -z "$EMAIL_IDS" ] && [ -z "$CALL_IDS" ]; then
    continue
  fi

  RESULT_FILE="$RESULTS_DIR/${DEAL_ID}.txt"

  # Check notes
  for NOTE_ID in $NOTE_IDS; do
    [ -z "$NOTE_ID" ] && continue
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
    [ -z "$EMAIL_ID" ] && continue
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
    [ -z "$CALL_ID" ] && continue
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

done
