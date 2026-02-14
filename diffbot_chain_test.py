import requests
import json
import time

TOKEN = "ce87104a92189d148cc2f3417ca0210e"

base_url = "https://api.diffbot.com/v3/list"

all_items = []
max_pages = 10

for page in range(1, max_pages + 1):
    page_url = "https://terracaboverde.com/properties/" if page == 1 else f"https://terracaboverde.com/properties/?e-page={page}"
    params = {
        "token": TOKEN,
        "url": page_url
    }

    print(f"Frågar efter sida {page}: {page_url}")

    try:
        response = requests.get(base_url, params=params, timeout=60)
        response.raise_for_status()

        data = response.json()

        if "objects" in data and data["objects"]:
            items = data["objects"][0].get("items", [])
            all_items.extend(items)
            print(f"Sida {page}: {len(items)} listings")
        else:
            print(f"Inga listings på sida {page}")
            break

    except requests.exceptions.HTTPError as e:
        print(f"Fel på sida {page}: {e}")
        if response.status_code == 429:
            wait = 12  # Säkerhetsmarginal
            print(f"Rate limit – väntar {wait} sekunder...")
            time.sleep(wait)
            continue
        break

    time.sleep(12)  # Delay mellan requests

print(f"\nTotalt listings över {len(all_items)} sidor: {len(all_items)}")
if all_items:
    print("Exempel på första listing:")
    print(json.dumps(all_items[0], indent=2))