import os
import requests
import json
from datetime import datetime, timedelta, timezone

HUBSPOT_TOKEN = "REDACTED"
HEADERS = {
    "Authorization": f"Bearer {HUBSPOT_TOKEN}",
    "Content-Type": "application/json"
}

def get_owners():
    url = "https://api.hubapi.com/crm/v3/owners"
    response = requests.get(url, headers=HEADERS)
    owners = response.json().get('results', [])
    print(f"DEBUG: All owners: {[ (o.get('firstName'), o.get('lastName'), o.get('email'), o.get('id')) for o in owners]}")
    ryan_ids = [o['id'] for o in owners if o.get('firstName') and 'ryan' in o['firstName'].lower()]
    return ryan_ids

def get_list_by_name(name):
    url = "https://api.hubapi.com/crm/v3/lists/search"
    payload = {"query": name}
    response = requests.post(url, headers=HEADERS, json=payload)
    if response.status_code != 200:
        print(f"Error searching lists: {response.text}")
        return None
    data = response.json()
    for l in data.get('lists', []):
        if l['name'] == name:
            return l['listId']
    return None

def get_list_members(list_id):
    # The Legacy List API or v3 List API? The search was v3.
    # v3 membership endpoint: GET /crm/v3/lists/{listId}/memberships
    url = f"https://api.hubapi.com/crm/v3/lists/{list_id}/memberships"
    members = []
    after = None
    while True:
        params = {"limit": 100}
        if after: params['after'] = after
        response = requests.get(url, headers=HEADERS, params=params)
        if response.status_code != 200:
            print(f"Error fetching members: {response.text}")
            break
        data = response.json()
        members.extend([m['recordId'] for m in data.get('results', []) or []])
        after = data.get('paging', {}).get('next', {}).get('after')
        if not after: break
    return members

def get_associated_objects(object_type, object_id, to_type):
    url = f"https://api.hubapi.com/crm/v3/objects/{object_type}/{object_id}/associations/{to_type}"
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200: return []
    return [r['id'] for r in response.json().get('results', [])]

def get_object_properties(object_type, object_id, properties):
    url = f"https://api.hubapi.com/crm/v3/objects/{object_type}/{object_id}"
    params = {"properties": ",".join(properties)}
    response = requests.get(url, headers=HEADERS, params=params)
    if response.status_code != 200: return {}
    return response.json().get('properties', {})

def main():
    ryan_ids = get_owners()
    print(f"Found Ryan IDs: {ryan_ids}")
    
    list_name = "First 180 Days ALL DEALS"
    list_id = get_list_by_name(list_name)
    if not list_id:
        print(f"List '{list_name}' not found.")
        return

    print(f"Found list {list_id}. Fetching members...")
    deal_ids = get_list_members(list_id)
    print(f"Found {len(deal_ids)} deals.")

    now = datetime.now(timezone.utc)
    fourteen_days_ago = now - timedelta(days=14)
    
    no_outreach = []
    ryan_tone_samples = []

    # Process first 10 deals
    for i, deal_id in enumerate(deal_ids[:10]):
        company_ids = get_associated_objects("deals", deal_id, "companies")
        if not company_ids: continue
        
        company_id = company_ids[0]
        company_props = get_object_properties("companies", company_id, ["name"])
        company_name = company_props.get("name", "Unknown")
        print(f"[{i+1}/10] Checking {company_name}...", flush=True)

        recent_ryan = False
        
        # Check engagements
        for engagement_type in ["emails", "calls", "communications"]:
            eng_ids = get_associated_objects("companies", company_id, engagement_type)
            for eid in eng_ids:
                props = ["hs_timestamp", "hubspot_owner_id", "hs_body_preview", "hs_email_subject", "hs_email_text", "hs_note_body"]
                obj_props = get_object_properties(engagement_type, eid, props)
                
                owner_id = obj_props.get("hubspot_owner_id")
                if owner_id in ryan_ids:
                    ts_str = obj_props.get("hs_timestamp")
                    body = obj_props.get("hs_email_text") or obj_props.get("hs_body_preview") or obj_props.get("hs_note_body")
                    if body:
                        ryan_tone_samples.append({"type": engagement_type, "body": body, "subject": obj_props.get("hs_email_subject")})
                    
                    if ts_str:
                        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if ts > fourteen_days_ago:
                            recent_ryan = True
                            print(f"  -> Recent outreach by Ryan found.", flush=True)
                            break
            if recent_ryan: break

        if not recent_ryan:
            print(f"  -> No recent Ryan outreach.", flush=True)
            no_outreach.append(company_name)

    print("\nCompanies with NO Ryan outreach in last 14 days (First 10 sample):")
    for c in sorted(list(set(no_outreach))):
        print(f"- {c}")

    print("\n--- Tone Samples ---")
    for s in ryan_tone_samples[:3]:
        print(f"Type: {s['type']} | Subject: {s['subject']}")
        print(f"Body: {s['body'][:400]}...\n")

if __name__ == "__main__":
    main()
