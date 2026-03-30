#!/bin/bash
while read deal_id; do
  # Get associate notes
  notes=$(curl -s "https://api.hubapi.com/crm/v3/objects/deals/$deal_id/associations/notes" \
       -H "Authorization: Bearer REDACTED")
  
  note_ids=$(echo "$notes" | jq -r '.results[].id' 2>/dev/null)
  
  if [[ -n "$note_ids" ]]; then
    for note_id in $note_ids; do
      note_data=$(curl -s "https://api.hubapi.com/crm/v3/objects/notes/$note_id?properties=hs_note_body" \
           -H "Authorization: Bearer REDACTED")
      body=$(echo "$note_data" | jq -r '.properties.hs_note_body' | tr '[:upper:]' '[:lower:]')
      
      if [[ "$body" =~ checklist || "$body" =~ forms || "$body" =~ safety || "$body" =~ swms || "$body" =~ jsa ]]; then
        echo "MATCHED: $deal_id because of note $note_id: $body" >> matches.txt
      fi
    done
  fi
done < lost_ids_pool.txt
