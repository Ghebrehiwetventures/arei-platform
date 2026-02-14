# How to Add a New Market (Country)

> **PoC validated:** This process has been tested with 4 African markets (CV, KE, GH, ZA) with 84% average kept-rate and zero per-country code changes.

## Quick Start (5 minutes)

### Step 1: Create market directory
```bash
mkdir -p markets/{country_code}
```

### Step 2: Create sources.yml
```bash
touch markets/{country_code}/sources.yml
```

### Step 3: Add source configuration

Use this template:

```yaml
market: {country_code}

sources:
  - id: {country_code}_{source_name}
    name: "Human Readable Name"
    url: https://example.com/for-sale
    type: html
    lifecycleOverride: IN

    cms_type: custom
    fetch_method: http  # or "headless" for JS-heavy sites

    pagination:
      type: query_param  # or "none", "path_segment"
      param: "page"
      start: 1
      first_no_param: true

    delay_ms: 3000
    jitter_ms: 1000
    max_items: 50
    max_pages: 3

    selectors:
      listing: ".property-card"      # Container for each listing
      link: "a[href*='/property/']"  # Detail page link (or empty if listing IS the link)
      title: "h2, .title"
      price: ".price"
      location: ".address"
      image: "img"

    price_format:
      currency_symbol: "R"           # Local currency
      thousands_separator: " "       # " " or "," or "."

    id_prefix: "src"
```

### Step 4: Run ingest
```bash
MARKET_ID={country_code} npx ts-node --transpile-only core/ingestMarket.ts
```

### Step 5: Check results
```bash
cat artifacts/{country_code}_drop_report.json | jq '.sources[] | {id: .source_id, fetched: .fetched_total, kept: .kept_normalized}'
```

---

## Finding Selectors (DOM Inspection)

### Method 1: Browser DevTools
1. Open the property listing page
2. Right-click a property card → Inspect
3. Find the container element (usually `<div>`, `<article>`, or `<a>`)
4. Note the class name → use as `listing` selector

### Method 2: JavaScript Console
```javascript
// Find listing cards
document.querySelectorAll('[class*="property"], [class*="listing"], article').length

// Check price element
document.querySelector('.price')?.innerText

// Check if card itself is a link
document.querySelector('.listing-card')?.tagName  // "A" means it's a link
```

---

## Common Patterns & Solutions

### Pattern 1: Listing card is itself a link
```yaml
selectors:
  listing: "a.property-card"
  link: ""  # Empty - the container IS the link
```

### Pattern 2: Lazy-loaded images
Set `fetch_method: headless` - the pipeline auto-scrolls to trigger lazy loading.

### Pattern 3: Background-image instead of img tag
```yaml
selectors:
  image: ".image-wrapper"  # Pipeline extracts from style="background-image:url(...)"
```

### Pattern 4: Location in URL, not DOM
The pipeline auto-extracts location from URL paths like:
`/for-sale/gauteng/johannesburg/123` → "Gauteng, Johannesburg"

### Pattern 5: Location in img alt attribute
```yaml
location_patterns:
  - "Cape Town"
  - "Johannesburg"
  - "Nairobi"
```
Pipeline searches both container text AND img alt attributes.

---

## Troubleshooting

### No listings found
- Check if site needs `fetch_method: headless`
- Verify `listing` selector matches elements
- Check browser console: `document.querySelectorAll('.your-selector').length`

### All listings dropped (missing_price/location/images)
- Check drop report: `cat artifacts/{market}_drop_report.json`
- Inspect which field is failing
- Adjust selector or add `location_patterns`

### Duplicate listings
- Add `reject_url_patterns` to filter pagination URLs
- Set `min_path_segments` to require valid detail URLs

---

## Validation Checklist

- [ ] `MARKET_ID={code} npx ts-node core/ingestMarket.ts` runs without errors
- [ ] Drop report shows >50% kept_normalized rate
- [ ] No code changes required (YAML only)
- [ ] Re-running produces same results (idempotent)

---

## Reference: Tested Markets

| Market | Sources | Kept Rate | Notes |
|--------|---------|-----------|-------|
| KE (Kenya) | 3 | 100% | All standard selectors |
| ZA (South Africa) | 1 | 100% | Listing-as-link pattern |
| GH (Ghana) | 1 | 68% | Lazy-loading images |
| CV (Cape Verde) | 7 | 57% | Mixed quality sources |

**Total: 289 fetched, 243 kept (84%)**
