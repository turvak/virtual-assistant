#!/usr/bin/env python3
"""
Exhaustive HubSpot Closed Lost deal scan for keywords:
checklist, form, safety, swms, jsa
"""

import requests
import json
import time
import re
import sys

HUBSPOT_TOKEN = "REDACTED"
HEADERS = {
    "Authorization": f"Bearer {HUBSPOT_TOKEN}",
    "Content-Type": "application/json"
}
BASE = "https://api.hubapi.com"

KEYWORDS = ["checklist", "form", "safety", "swms", "jsa"]
KEYWORD_RE = re.compile(r'\b(' + '|'.join(KEYWORDS) + r')\b', re.IGNORECASE)

def hs_get(url, params=None):
    """Rate-limited GET with retry."""
    for attempt in range(5):
        r = requests.get(url, headers=HEADERS, params=params)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 10))
            print(f"  [rate limit] sleeping {wait}s", flush=True)
            time.sleep(wait)
            continue
        if r.status_code >= 500:
            time.sleep(5)
            continue
        return r
    return None

def hs_post(url, payload):
    """Rate-limited POST with retry."""
    for attempt in range(5):
        r = requests.post(url, headers=HEADERS, json=payload)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 10))
            print(f"  [rate limit] sleeping {wait}s", flush=True)
            time.sleep(wait)
            continue
        if r.status_code >= 500:
            time.sleep(5)
            continue
        return r
    return None

def fetch_all_closed_lost_deals():
    """Fetch all deals where dealstage is closed-lost (hs_is_closed_lost=true)."""
    print("Fetching all Closed Lost deals...", flush=True)
    deals = []
    after = None
    page = 0
    
    while True:
        payload = {
            "filterGroups": [
                {
                    "filters": [
                        {
                            "propertyName": "hs_is_closed_lost",
                            "operator": "EQ",
                            "value": "true"
                        }
                    ]
                }
            ],
            "properties": ["dealname", "amount", "dealstage", "closedate", "hs_is_closed_lost"],
            "limit": 100
        }
        if after:
            payload["after"] = after
        
        r = hs_post(f"{BASE}/crm/v3/objects/deals/search", payload)
        if not r or r.status_code != 200:
            print(f"  Error fetching deals: {r.status_code if r else 'None'} {r.text if r else ''}", flush=True)
            break
        
        data = r.json()
        results = data.get("results", [])
        deals.extend(results)
        page += 1
        print(f"  Page {page}: fetched {len(results)} deals (total so far: {len(deals)})", flush=True)
        
        paging = data.get("paging", {})
        after = paging.get("next", {}).get("after")
        if not after:
            break
        time.sleep(0.2)
    
    print(f"Total Closed Lost deals: {len(deals)}", flush=True)
    return deals

def fetch_associations(deal_id, obj_type):
    """Fetch associated object IDs for a deal."""
    url = f"{BASE}/crm/v4/objects/deals/{deal_id}/associations/{obj_type}"
    r = hs_get(url)
    if not r or r.status_code != 200:
        return []
    data = r.json()
    return [item["toObjectId"] for item in data.get("results", [])]

def fetch_note(note_id):
    """Fetch note body."""
    r = hs_get(f"{BASE}/crm/v3/objects/notes/{note_id}", params={"properties": "hs_note_body,hs_timestamp"})
    if not r or r.status_code != 200:
        return ""
    props = r.json().get("properties", {})
    return props.get("hs_note_body", "") or ""

def fetch_email(email_id):
    """Fetch email body."""
    r = hs_get(f"{BASE}/crm/v3/objects/emails/{email_id}", params={"properties": "hs_email_subject,hs_email_text,hs_email_html"})
    if not r or r.status_code != 200:
        return ""
    props = r.json().get("properties", {})
    subject = props.get("hs_email_subject", "") or ""
    text = props.get("hs_email_text", "") or ""
    html = props.get("hs_email_html", "") or ""
    # Strip HTML tags roughly
    html_stripped = re.sub(r'<[^>]+>', ' ', html)
    return f"{subject} {text} {html_stripped}"

def fetch_call(call_id):
    """Fetch call body/transcript."""
    r = hs_get(f"{BASE}/crm/v3/objects/calls/{call_id}", params={"properties": "hs_call_body,hs_call_title,hs_call_disposition"})
    if not r or r.status_code != 200:
        return ""
    props = r.json().get("properties", {})
    body = props.get("hs_call_body", "") or ""
    title = props.get("hs_call_title", "") or ""
    return f"{title} {body}"

def fetch_meeting(meeting_id):
    """Fetch meeting body."""
    r = hs_get(f"{BASE}/crm/v3/objects/meetings/{meeting_id}", params={"properties": "hs_meeting_body,hs_meeting_title"})
    if not r or r.status_code != 200:
        return ""
    props = r.json().get("properties", {})
    body = props.get("hs_meeting_body", "") or ""
    title = props.get("hs_meeting_title", "") or ""
    return f"{title} {body}"

def search_text(text, deal_name, deal_amount, source_type, source_id, matches):
    """Search text for keywords and record matches."""
    if not text:
        return
    found = KEYWORD_RE.findall(text)
    if found:
        keywords_found = list(set(k.lower() for k in found))
        # Get a snippet around first match
        m = KEYWORD_RE.search(text)
        start = max(0, m.start() - 80)
        end = min(len(text), m.end() + 80)
        snippet = text[start:end].replace('\n', ' ').strip()
        matches.append({
            "deal_name": deal_name,
            "amount": deal_amount,
            "source_type": source_type,
            "source_id": source_id,
            "keywords": keywords_found,
            "snippet": snippet
        })

def main():
    deals = fetch_all_closed_lost_deals()
    
    all_matches = []
    total = len(deals)
    
    for i, deal in enumerate(deals):
        deal_id = deal["id"]
        props = deal.get("properties", {})
        deal_name = props.get("dealname", f"Deal {deal_id}")
        deal_amount = props.get("amount", "0") or "0"
        
        if (i + 1) % 25 == 0 or i == 0:
            print(f"[{i+1}/{total}] Scanning: {deal_name} (${deal_amount})", flush=True)
        
        # Fetch notes
        note_ids = fetch_associations(deal_id, "notes")
        for nid in note_ids:
            text = fetch_note(nid)
            search_text(text, deal_name, deal_amount, "note", nid, all_matches)
            time.sleep(0.05)
        
        # Fetch emails
        email_ids = fetch_associations(deal_id, "emails")
        for eid in email_ids:
            text = fetch_email(eid)
            search_text(text, deal_name, deal_amount, "email", eid, all_matches)
            time.sleep(0.05)
        
        # Fetch calls
        call_ids = fetch_associations(deal_id, "calls")
        for cid in call_ids:
            text = fetch_call(cid)
            search_text(text, deal_name, deal_amount, "call", cid, all_matches)
            time.sleep(0.05)
        
        # Fetch meetings
        meeting_ids = fetch_associations(deal_id, "meetings")
        for mid in meeting_ids:
            text = fetch_meeting(mid)
            search_text(text, deal_name, deal_amount, "meeting", mid, all_matches)
            time.sleep(0.05)
        
        time.sleep(0.1)
    
    # Deduplicate by deal_name + keyword combo
    print(f"\n\n=== SCAN COMPLETE ===", flush=True)
    print(f"Total deals scanned: {total}", flush=True)
    print(f"Total keyword matches (raw): {len(all_matches)}", flush=True)
    
    # Group by deal
    from collections import defaultdict
    deal_matches = defaultdict(list)
    for m in all_matches:
        deal_matches[m["deal_name"]].append(m)
    
    print(f"Deals with keyword matches: {len(deal_matches)}", flush=True)
    print("\n" + "="*80, flush=True)
    
    for deal_name, matches in sorted(deal_matches.items()):
        # Collect all keywords across all matches for this deal
        all_kws = list(set(kw for m in matches for kw in m["keywords"]))
        sources = list(set(m["source_type"] for m in matches))
        amount = matches[0]["amount"]
        try:
            amount_fmt = f"${float(amount):,.2f}"
        except:
            amount_fmt = f"${amount}"
        
        print(f"\nDEAL: {deal_name}", flush=True)
        print(f"  Amount: {amount_fmt}", flush=True)
        print(f"  Keywords: {', '.join(sorted(all_kws))}", flush=True)
        print(f"  Found in: {', '.join(sorted(sources))}", flush=True)
        for m in matches[:3]:  # Show up to 3 snippets
            print(f"  [{m['source_type']}] ...{m['snippet'][:200]}...", flush=True)
    
    # Save full results to JSON
    output_path = "/root/.openclaw/workspace/hubspot_scan_results.json"
    with open(output_path, "w") as f:
        json.dump({
            "total_deals": total,
            "deals_with_matches": len(deal_matches),
            "matches": all_matches
        }, f, indent=2)
    print(f"\nFull results saved to {output_path}", flush=True)

if __name__ == "__main__":
    main()
