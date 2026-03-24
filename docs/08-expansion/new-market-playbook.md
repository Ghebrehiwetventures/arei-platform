# New Market Playbook

Last updated: 2026-03-24

## Purpose

This document is the canonical market expansion playbook for AREI.

It explains when a new market should be started, what must be true before that happens, and how a new market should be onboarded without abandoning the operating discipline established in Market 1.

## When To Use This Playbook

Use this document when evaluating or onboarding a future market after the Cape Verde beachhead.

This is not a replacement for company strategy, Market 1 strategy, or launch execution. It is the operating playbook for disciplined expansion.

## Expansion Principles

New-market expansion should preserve the same principles that define AREI in Market 1:
- trust over inflated inventory
- normalization over raw scrape volume
- repeatable market setup over one-off hacks
- clear public data contracts over ambiguous data dumping
- market-by-market discipline over premature breadth

Expansion should grow out of a real platform advantage, not out of pressure to look bigger than the operating model can support.

## What Makes A Market Worth Entering

A market is a good candidate when:
- public inventory is fragmented enough that normalization creates real value
- the market is narrow enough for quality to remain visible
- multiple source types can be configured without rewriting the core system
- there is enough usable supply to justify a market-specific surface or structured internal coverage
- the market can teach lessons that improve the broader AREI platform

The goal is not market count for its own sake. The goal is defensible expansion.

## Preconditions Before Starting A New Market

Before starting a new market, AREI should have:
- a stable core ingestion and normalization model
- clear trust rules for public feed eligibility
- a working understanding of what Market 1 has and has not proven
- enough operating capacity to monitor another market without degrading existing quality

New-market work should not become an excuse to avoid unresolved product-truth or trust problems in the current beachhead.

## Market Setup Workflow

### Step 1: Create market directory

```bash
mkdir -p markets/{country_code}
```

### Step 2: Create `sources.yml`

```bash
touch markets/{country_code}/sources.yml
```

### Step 3: Run ingest

```bash
MARKET_ID={country_code} npx ts-node --transpile-only core/ingestMarket.ts
```

## Source Onboarding Workflow

### Step 1: Add source configuration

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
    fetch_method: http

    pagination:
      type: query_param
      param: "page"
      start: 1
      first_no_param: true

    delay_ms: 3000
    jitter_ms: 1000
    max_items: 50
    max_pages: 3

    selectors:
      listing: ".property-card"
      link: "a[href*='/property/']"
      title: "h2, .title"
      price: ".price"
      location: ".address"
      image: "img"

    price_format:
      currency_symbol: "R"
      thousands_separator: " "

    id_prefix: "src"
```

### Step 2: Find selectors

Method 1: browser DevTools
1. Open the property listing page.
2. Inspect a property card.
3. Find the container element.
4. Use that class or structure as the `listing` selector.

Method 2: JavaScript console

```javascript
document.querySelectorAll('[class*="property"], [class*="listing"], article').length
document.querySelector('.price')?.innerText
document.querySelector('.listing-card')?.tagName
```

### Step 3: Handle common source patterns

Pattern 1: listing card is itself a link

```yaml
selectors:
  listing: "a.property-card"
  link: ""
```

Pattern 2: lazy-loaded images

Set `fetch_method: headless`.

Pattern 3: background-image instead of `img`

```yaml
selectors:
  image: ".image-wrapper"
```

Pattern 4: location in URL

The pipeline can extract location from URL paths such as `/for-sale/gauteng/johannesburg/123`.

Pattern 5: location in image alt attribute

```yaml
location_patterns:
  - "Cape Town"
  - "Johannesburg"
  - "Nairobi"
```

## Validation And Quality Gates

After ingest, check results:

```bash
cat artifacts/{country_code}_drop_report.json | jq '.sources[] | {id: .source_id, fetched: .fetched_total, kept: .kept_normalized}'
```

Minimum validation expectations:
- ingest runs without errors
- the drop report shows a viable kept-normalized rate
- no per-country code changes are required for basic onboarding
- re-running produces stable results

Quality gates should check for:
- source coverage that is meaningful rather than token
- acceptable kept-rate after normalization
- workable location extraction
- usable image and price coverage where relevant
- a market configuration that fits the existing model rather than fighting it

## Readiness Criteria For A New Market

A new market is ready to move beyond basic setup when:
- source onboarding works through configuration rather than market-specific code surgery
- normalized output is stable enough to inspect and compare
- failure modes are understood
- coverage and kept-rate are strong enough to justify further investment
- the market adds platform learning rather than operational noise

## Common Failure Modes

### No listings found

- Check whether the site needs `fetch_method: headless`.
- Verify that the `listing` selector actually matches elements.

### All listings dropped

- Check the drop report.
- Inspect which required field is failing.
- Adjust selectors or location patterns.

### Duplicate listings

- Add `reject_url_patterns` if pagination URLs are being captured as listings.
- Set `min_path_segments` if detail URL quality is too weak.

## How Market Learnings Feed Back Into AREI

Each market should improve the platform, not just add surface area.

Useful new-market work should sharpen:
- source configuration patterns
- normalization behavior
- location modeling
- quality gates
- repeatable onboarding discipline

If a market requires breaking the core model in ad hoc ways, that is a signal to pause and rethink rather than forcing expansion through.

## Reference: Tested Markets

The current repo already includes evidence from tested markets:

| Market | Sources | Kept Rate | Notes |
| --- | --- | --- | --- |
| KE (Kenya) | 3 | 100% | All standard selectors |
| ZA (South Africa) | 1 | 100% | Listing-as-link pattern |
| GH (Ghana) | 1 | 68% | Lazy-loading images |
| CV (Cape Verde) | 7 | 57% | Mixed quality sources |

**Total: 289 fetched, 243 kept (84%)**

Market-specific details should remain in `markets/*/README.md` and related market config files.

## Relationship To Other Canonical Docs

- `docs/01-strategy/vision.md` defines the company-level expansion logic and moat.
- `docs/01-strategy/cape-verde-beachhead.md` explains what Market 1 is meant to prove before broader expansion.
- `docs/06-go-to-market/launch-plan.md` covers KazaVerde launch execution, not future-market onboarding.
- `docs/AREI_master_documentation_architecture.md` defines `08-expansion/` as the canonical home for this playbook.
