import requests
from datetime import datetime, timedelta, timezone

HUBSPOT_TOKEN = "REDACTED"
HEADERS = {"Authorization": f"Bearer {HUBSPOT_TOKEN}", "Content-Type": "application/json"}

def search_ryan_engagements():
    # Search for all emails/calls/notes containing "Ryan" to find his owner/author ID
    url = "https://api.hubapi.com/crm/v3/objects/emails/search"
    # Or just search for Ryan as a contact to find his owner record if he's an owner
    # Let's try searching communications for Ryan's name to find the owner_id
    payload = {
        "filterGroups": [
            {
                "filters": [
                    {"propertyName": "hs_email_text", "operator": "CONTAINS_TOKEN", "value": "Ryan"}
                ]
            }
        ],
        "limit": 5,
        "properties": ["hubspot_owner_id", "hs_email_text", "hs_email_subject", "hs_timestamp"]
    }
    response = requests.post(url, headers=HEADERS, json=payload)
    return response.json()

def main():
    data = search_ryan_engagements()
    print(f"Results: {data}")

if __name__ == "__main__":
    main()
