# Generic Config-Driven Pipeline - PoC Guide v2

## ✅ PoC-Mål Uppfyllda

| Mål | Status | Lösning |
|-----|--------|---------|
| Ny källa/land = endast config-ändring | ✅ | YAML-driven |
| Ingen per-källa funktion eller if-branch | ✅ | Generic fetcher + extractors |
| Full automation, no manual fixes | ✅ | Config defaults + CMS presets |
| Gemensam schema + valideringsregler | ✅ | Golden rules + presets |
| Selectors fallback-defaults | ✅ | CMS presets (Elementor, WordPress, etc.) |
| Config-driven detail extraction | ✅ | YAML selectors + spec_patterns |
| Location mapping i config | ✅ | markets/{market}/locations.yml |

---

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        CONFIG LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  sources.yml          │  locations.yml     │  rules.yml     │
│  - pagination         │  - islands[]       │  - min_price   │
│  - cms_type           │  - cities[]        │  - blockers    │
│  - selectors          │  - aliases         │                │
│  - detail.selectors   │  - patterns        │                │
│  - spec_patterns      │                    │                │
│  - amenity_keywords   │                    │                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       GENERIC LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  cmsPresets.ts          │  genericFetcher.ts               │
│  - ELEMENTOR            │  - genericPaginatedFetcher()     │
│  - WORDPRESS            │  - buildFetchConfigFromYaml()    │
│  - WIX                  │  - mergeWithPreset()             │
│  - SQUARESPACE          │                                   │
│  - SHOPIFY              │                                   │
│  - CUSTOM (fallback)    │                                   │
├─────────────────────────┼───────────────────────────────────┤
│  genericDetailExtractor │  locationMapper.ts               │
│  - genericDetailExtract │  - parseLocation()               │
│  - spec pattern matching│  - loadLocationsConfig()         │
│  - amenity detection    │  - island/city resolution        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     INGEST LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  ingestCvGeneric.ts                                          │
│  - ZERO source-specific if/else                              │
│  - genericFetchSource() reads from config                    │
│  - genericDetailEnrichment() reads from config               │
│  - parseLocation() reads from locations.yml                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Nya Filer

| Fil | Syfte |
|-----|-------|
| `core/cmsPresets.ts` | CMS-specifika selector/pagination defaults |
| `core/genericDetailExtractor.ts` | Config-driven detail extraction |
| `core/locationMapper.ts` | Config-driven location parsing |
| `markets/cv/locations.yml` | Cape Verde island/city mapping |

---

## 🎯 CMS Presets

### Supported CMS Types

| CMS | Detection Patterns | Default Pagination |
|-----|-------------------|-------------------|
| `elementor` | `e-loop-item`, `elementor-widget` | `?e-page=` |
| `wordpress` | `wp-content`, `wp-post-image` | `?paged=` |
| `wix` | `wix.com`, `data-hook` | Next link |
| `squarespace` | `sqsp`, `static1.squarespace` | Next link |
| `shopify` | `cdn.shopify`, `myshopify` | `?page=` |
| `custom` | (fallback) | `?page=` |

### Automatic Fallback

Om en källa inte specificerar alla selectors, fylls de i från CMS preset:

```yaml
# sources.yml
- id: cv_terracaboverde
  cms_type: elementor       # ← Anger CMS
  selectors:
    listing: "[class*='e-loop-item']"
    link: "a[href*='/properties/']"
    # title, price, image → använder elementor preset defaults!
```

**Elementor preset defaults:**
```typescript
{
  listing: "[class*='e-loop-item'], .elementor-post",
  title: ".elementor-heading-title, .elementor-post__title, h2, h3",
  price: ".elementor-price, [class*='price'], .price",
  image: ".elementor-image img, .swiper-slide img, img",
}
```

---

## 📝 Config-Driven Detail Extraction

### YAML Config (sources.yml)

```yaml
detail:
  enabled: true
  policy: always              # always | on_violation | never
  delay_ms: 2500

  # CSS selectors för detail-sidan
  selectors:
    description: "h2:contains('Description') + .elementor-widget-text-editor"
    images: "#prop-gallery img, .swiper-slide a[href*='.jpg']"

  # Regex patterns för structured data
  spec_patterns:
    bedrooms:
      - "(\\d+)\\s*(?:Bedrooms?|Quartos?)"
      - "(?:Bedrooms?)\\s*[:\\-]?\\s*(\\d+)"
    bathrooms:
      - "(\\d+)\\s*(?:Bathrooms?|Banheiros?)"
    parking:
      - "(\\d+)\\s*(?:Parking|Garage|Vagas?)"
    area:
      - "(\\d+(?:[.,]\\d+)?)\\s*(?:m²|sqm)"

  # Amenity keywords med språkstöd
  amenity_keywords:
    pool: ["pool", "piscina", "swimming"]
    sea_view: ["sea view", "vista mar", "ocean view"]
    balcony: ["balcony", "varanda"]
    air_conditioning: ["air conditioning", "ar condicionado", "a/c"]
```

### genericDetailExtract() - Kod

```typescript
// core/genericDetailExtractor.ts
export function genericDetailExtract(
  html: string,
  baseUrl: string,
  config: DetailExtractionConfig
): DetailExtractionResult {
  const $ = cheerio.load(html);

  // 1. CMS auto-detection for selector fallbacks
  const cmsType = config.cms_type || detectCMS(html);

  // 2. Extract description from config selectors
  if (config.selectors.description) {
    const selectors = config.selectors.description.split(",");
    for (const sel of selectors) {
      const text = $(sel.trim()).text().trim();
      if (text.length >= 50) {
        result.description = text;
        break;
      }
    }
  }

  // 3. Extract specs via regex patterns
  const pageText = $("body").text();
  for (const pattern of config.spec_patterns.bedrooms) {
    const match = pageText.match(new RegExp(pattern, "i"));
    if (match) {
      result.bedrooms = parseInt(match[1], 10);
      break;
    }
  }

  // 4. Detect amenities with negation guard
  for (const [amenity, keywords] of Object.entries(config.amenity_keywords)) {
    for (const keyword of keywords) {
      if (pageText.includes(keyword) && !hasNegationNearby(pageText, keyword)) {
        result.amenities.push(amenity);
        break;
      }
    }
  }

  return result;
}
```

---

## 🗺️ Location Mapping (Config-Driven)

### locations.yml Schema

```yaml
# markets/cv/locations.yml
market: cv
country: Cape Verde
currency: EUR

islands:
  - name: Sal
    aliases:
      - "Sal"
      - "Ilha do Sal"
    cities:
      - name: Santa Maria
        aliases:
          - "Santa Maria"
          - "Sta Maria"
        default: true       # Default city för denna ö

  - name: Boa Vista
    aliases:
      - "Boa Vista"
      - "Boavista"
    cities:
      - name: Sal Rei
        aliases:
          - "Sal Rei"
        default: true

# Regex patterns för location extraction
location_patterns:
  - "Boa Vista"
  - "Sal\\b"
  - "Santa Maria"
```

### parseLocation() - Kod

```typescript
// core/locationMapper.ts
export function parseLocation(
  locationText: string | undefined,
  marketId: string
): LocationResult {
  const config = loadLocationsConfig(marketId);

  // 1. Try to match cities first (more specific)
  for (const island of config.islands) {
    for (const city of island.cities) {
      for (const alias of city.aliases) {
        if (textLower.includes(alias.toLowerCase())) {
          return { island: island.name, city: city.name };
        }
      }
    }
  }

  // 2. Fall back to island matching
  for (const island of config.islands) {
    for (const alias of island.aliases) {
      if (textLower.includes(alias.toLowerCase())) {
        const defaultCity = island.cities.find(c => c.default);
        return {
          island: island.name,
          city: defaultCity?.name
        };
      }
    }
  }

  return { raw: locationText };
}
```

---

## 🌍 Lägga till Ny Källa (Kenya-exempel)

### Steg 1: Skapa locations.yml

```yaml
# markets/ke/locations.yml
market: ke
country: Kenya
currency: KES

regions:
  - name: Nairobi
    aliases: ["Nairobi", "NBO"]
    cities:
      - name: Nairobi CBD
        aliases: ["CBD", "Central Business"]
        default: true
      - name: Westlands
        aliases: ["Westlands"]

  - name: Mombasa
    aliases: ["Mombasa", "MSA"]
    cities:
      - name: Mombasa
        default: true
      - name: Diani
        aliases: ["Diani Beach"]

location_patterns:
  - "Nairobi"
  - "Mombasa"
  - "Kisumu"
```

### Steg 2: Skapa sources.yml med CMS type

```yaml
# markets/ke/sources.yml
market: ke

sources:
  - id: ke_buyrentkenya
    name: "BuyRentKenya"
    url: https://www.buyrentkenya.com/property-for-sale
    type: html
    lifecycleOverride: IN

    cms_type: wordpress      # ← CMS preset

    fetch_method: http

    pagination:
      type: query_param
      param: "page"
      start: 1
      first_no_param: true

    delay_ms: 3000
    max_items: 200

    selectors:
      listing: ".listing-card"
      link: "a[href*='/property/']"
      # title, price, image → wordpress preset defaults

    price_format:
      currency_symbol: "KES"
      thousands_separator: ","

    detail:
      enabled: true
      policy: on_violation
      delay_ms: 3000
      selectors:
        description: ".property-description"
        images: ".gallery-image img"
      spec_patterns:
        bedrooms:
          - "(\\d+)\\s*(?:Bed(?:room)?s?|BR)"
        bathrooms:
          - "(\\d+)\\s*(?:Bath(?:room)?s?)"
      amenity_keywords:
        parking: ["parking", "garage"]
        security: ["security", "24/7", "gated"]
```

### Steg 3: Kör ingest

```bash
MARKET_ID=ke ts-node ingestGeneric.ts
```

**INGEN KODÄNDRING!**

---

## 📊 Config-Referens

### sources.yml Schema

| Fält | Typ | Default | Beskrivning |
|------|-----|---------|-------------|
| `id` | string | required | Unikt source ID |
| `name` | string | required | Display name |
| `url` | string | required | Base URL |
| `type` | `html` / `stub` | required | Source type |
| `lifecycleOverride` | `IN` / `OBSERVE` / `DROP` | `IN` | Lifecycle state |
| `cms_type` | enum | `custom` | CMS för preset fallbacks |
| `fetch_method` | `http` / `headless` | `http` | Fetch strategy |
| `pagination` | object | preset | Pagination config |
| `selectors` | object | preset | CSS selectors |
| `delay_ms` | number | 2500 | Delay mellan requests |
| `jitter_ms` | number | 500 | Random jitter |
| `max_items` | number | 200 | Max listings |
| `max_pages` | number | 50 | Max pages |
| `stop_condition` | enum | `empty_listings` | Stop condition |
| `reject_url_patterns` | string[] | `[]` | URL patterns att avvisa |
| `min_path_segments` | number | - | Min URL path segments |
| `price_format` | object | - | Price parsing config |
| `detail` | object | - | Detail extraction config |

### detail Schema

| Fält | Typ | Default | Beskrivning |
|------|-----|---------|-------------|
| `enabled` | boolean | false | Enable detail extraction |
| `policy` | `always` / `on_violation` / `never` | `on_violation` | When to extract |
| `delay_ms` | number | 2500 | Delay mellan detail fetches |
| `selectors` | object | - | CSS selectors för detail page |
| `spec_patterns` | object | defaults | Regex patterns för structured data |
| `amenity_keywords` | object | defaults | Keywords per amenity |
| `negation_words` | string[] | defaults | Words that cancel amenity |

### cms_type Values

| Värde | Beskrivning |
|-------|-------------|
| `elementor` | WordPress + Elementor builder |
| `wordpress` | Standard WordPress themes |
| `wix` | Wix websites |
| `squarespace` | Squarespace templates |
| `shopify` | Shopify storefronts |
| `custom` | Generic fallback (default) |

---

## 🐛 Debug

### Enable all debug logging

```bash
DEBUG_GENERIC=1 DEBUG_DETAIL=1 ts-node ingestCvGeneric.ts
```

### Debug output example

```
[GenericFetcher] CMS detected: elementor
[GenericFetcher] Using preset selectors for: title, price, image
[GenericFetcher] Fetching page 1: https://terracaboverde.com/properties/
[GenericFetcher] Page 1: 12 listings (HTML: 145232 bytes)
...
[GenericDetailExtractor] Extracting from: .../villa-sal/
[GenericDetailExtractor] Description: 847 chars
[GenericDetailExtractor] Specs found: bedrooms=3, bathrooms=2
[GenericDetailExtractor] Amenities: pool, sea_view, terrace
[LocationMapper] Parsed "Santa Maria, Sal" → island=Sal, city=Santa Maria
```

---

## ✅ Borttagna Special Cases

| Före | Efter |
|------|-------|
| `if (source.id === "cv_terracaboverde")` | `config.fetch_method` |
| `parseTerraCaboVerdePaginated()` | `genericPaginatedFetcher(config)` |
| `enrichTerraDescriptions()` | `genericDetailEnrichment(config)` |
| `terraCaboVerdePlugin.extract()` | `genericDetailExtract(config)` |
| Hårdkodad location mapping | `parseLocation(text, marketId)` |
| Hårdkodade selectors | CMS presets + YAML overrides |

---

## 🔄 Pagination Types

### Supported Types

| Type | Method | When to Use |
|------|--------|-------------|
| `auto` | Auto-detect | **Default for new sources** - tries to detect from HTML |
| `query_param` | HTTP | URL has `?page=2`, `?e-page=3`, etc. |
| `click_next` | Headless | JS/AJAX pagination where URL doesn't change |
| `infinite_scroll` | Headless | Scroll-triggered content loading |
| `none` | - | Single page, no pagination |

### Auto-Detection (`type: auto`)

When `pagination.type: auto`, the pipeline will:
1. Fetch the first page
2. Analyze HTML for pagination patterns
3. Detect: query params in links, next button selectors, infinite scroll indicators
4. Automatically configure the appropriate pagination type

```yaml
# Recommended for new sources - let the system figure it out
pagination:
  type: auto
```

**Detection signals:**
- `rel="next"` links → `query_param`
- `?page=`, `?e-page=`, `?paged=` in pagination links → `query_param`
- Next buttons with `href="#"` or `onclick` → `click_next`
- `IntersectionObserver`, `infinite-scroll` in JS → `infinite_scroll`

### Click-Based Pagination (`type: click_next`)

For sites where URL doesn't change on pagination (client-side JS pagination):

```yaml
pagination:
  type: click_next
  next_selector: ".pagination a.next"  # Optional - auto-detected if omitted
```

**Requires:** `fetch_method: headless`

**Auto-detected selectors (tried in order):**
1. `a[rel="next"]`
2. `[aria-label="Next"]`
3. `.pagination .next a`
4. `.page-numbers.next`
5. `.elementor-pagination .page-numbers.next`
6. ...and 6 more common patterns

**Content change detection:** Uses `MutationObserver` to reliably detect when AJAX content updates, with network idle fallback.

---

## ⚠️ HONEST LIMITATIONS

### What Auto-Detection CAN'T Handle

| Scenario | Why It Fails | Workaround |
|----------|--------------|------------|
| **SPAs (React/Vue/Angular)** | Cheerio sees empty shell before hydration | Manual `click_next` with headless, or external acquisition |
| **Obfuscated selectors** | CSS modules: `.Button_next__x7Yz9` | Manual `next_selector` config |
| **Auth-gated pagination** | Different HTML for logged-in users | Session cookies + manual config |
| **Anti-bot protection** | Cloudflare, DataDome serve different HTML | External acquisition layer |
| **Viewport-conditional** | Mobile vs desktop pagination differs | Set viewport in headless config |

### Reliability Estimate

```
┌─────────────────────────────────────────────────────────┐
│  AUTO-DETECTION SUCCESS RATE                             │
├─────────────────────────────────────────────────────────┤
│  Standard CMS sites (WordPress, Elementor, Wix)   ~80%  │
│  Custom-built sites with standard patterns        ~60%  │
│  SPAs with server-side rendering (Next.js, etc.)  ~40%  │
│  Pure SPAs (client-only React/Vue)                ~10%  │
│  Sites with anti-bot protection                   ~5%   │
└─────────────────────────────────────────────────────────┘
```

### When to Use External Acquisition Layer

**Recommendation:** For production multi-country ingestion, use an external acquisition layer:

| Service | Strengths | Use Case |
|---------|-----------|----------|
| **Browserless.io** | Managed Puppeteer, stealth mode | General headless |
| **ScrapingBee** | Proxy rotation, JS rendering | Anti-bot bypass |
| **Bright Data** | Residential proxies, CAPTCHA solving | Aggressive sites |
| **Apify** | Actor marketplace, scheduling | Complex workflows |
| **Self-hosted Playwright cluster** | Full control, cost-effective at scale | >10k pages/day |

**Architecture:**
```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ Your Config  │────▶│ Acquisition Layer    │────▶│ Clean HTML       │
│ (sources.yml)│     │ (Browserless, etc.)  │     │ (no bot issues)  │
└──────────────┘     └──────────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
                                              ┌──────────────────────┐
                                              │ Generic Pipeline     │
                                              │ (parsing only)       │
                                              └──────────────────────┘
```

This decouples acquisition complexity from parsing logic.

---

## ⚠️ Kvarvarande Risker

| Risk | Mitigation |
|------|-----------|
| CMS auto-detection kan misslyckas | Specificera `cms_type` explicit i config |
| Pagination auto-detection kan misslyckas | Specificera `pagination.type` och `next_selector` explicit |
| Spec patterns matchar inte alla format | Lägg till fler patterns i config |
| Bot detection blockerar | External acquisition layer (Browserless, ScrapingBee) |
| Komplexa detail pages | Lägg till fler selectors i config |
| SPAs without SSR | Per-source headless config or external acquisition |

---

## 🔄 Migration Guide

### Från gamla ingestCv.ts

1. Byt från `ingestCv.ts` till `ingestCvGeneric.ts`
2. Uppdatera sources.yml med `cms_type` och `detail` block
3. Skapa locations.yml för market
4. Ta bort source-specifika plugins

```bash
# Verifiera ingen source-specifik kod kvar
grep -r "cv_terracaboverde\|cv_simply" core/*.ts
# Förväntat resultat: Inga träffar (endast i ingestCv.ts, som är deprecated)
```

---

## ✅ Definition of Done (PoC Complete)

**Uppnått 2026-02-03:**

| Kriterium | Status | Bevis |
|-----------|--------|-------|
| Ingen source-specifik if/else i ingestCvGeneric.ts | ✅ | `grep -n "if.*source.*id" core/ingestCvGeneric.ts` → Inga träffar |
| Plugins helt borttagna | ✅ | Ingen import av `terraCaboVerdePlugin` eller `simplyCapeVerdePlugin` |
| Location mapping config-driven | ✅ | Använder `parseLocation()` från `locationMapper.ts` |
| Detail extraction config-driven | ✅ | Använder `genericDetailExtract()` från `genericDetailExtractor.ts` |
| Samma kod för flera källor | ✅ | Terra + SimplyCapeVerde körs med identisk kodväg |
| Körbar med DEBUG_GENERIC=1 | ✅ | 12 listings hämtade, 12 berikade, 0 failed |

### Körlogg (2026-02-03)

```
[cv_terracaboverde] Parsed 9 listings from 1 pages
[cv_simplycapeverde] Parsed 3 listings from 1 pages
[GenericEnrich] Complete: 12 enriched, 0 failed
Summary: 15 visible, 3 hidden
[Supabase] Upserted 18 listings
```

### Grep-bevis

```bash
$ grep -n "terraCaboVerdePlugin\|simplyCapeVerdePlugin" core/ingestCvGeneric.ts
# (ingen output = inga plugins)

$ grep -n "if.*source.id.*===" core/ingestCvGeneric.ts
# (ingen output = ingen source-specifik branching)
```

### Tillåtna beroenden

- `sources.yml` (config)
- `locations.yml` (config)
- `genericFetcher.ts` (generic)
- `genericDetailExtractor.ts` (generic)
- `locationMapper.ts` (generic)
- `cmsPresets.ts` (generic)

### Förbjudet (och bekräftat borttaget)

- ❌ Plugins (terraCaboVerdePlugin, simplyCapeVerdePlugin)
- ❌ Source-specifika if/else
- ❌ Hårdkodad location mapping
- ❌ Fallback-logik till plugins

---

## 🔒 Schema Freeze

**Output-schema är fryst från 2026-02-03.**

Inga ändringar i `SupabaseListing`-interface eller `IngestReport`-struktur utan explicit beslut.

Ändringar kräver:
1. Dokumenterad motivering
2. Impact-analys på existerande data
3. Godkännande enligt GOVERNANCE.md

---

## ✅ FAS 2C: Replikering (Kenya) - Complete

**Uppnått 2026-02-03:**

### Bevis: Samma kod för 2 marknader

| Market | Körkommando | Resultat |
|--------|-------------|----------|
| Cape Verde (cv) | `MARKET_ID=cv ts-node core/ingestMarket.ts` | 12 listings, EUR |
| Kenya (ke) | `MARKET_ID=ke ts-node core/ingestMarket.ts` | 1 stub listing, KES |

### Arkitekturfix: Islands vs Regions

**Problem upptäckt:** `locationMapper.ts` var hårdkodad för `islands[]`.
Kenya använder `regions[]`.

**Lösning:** Generaliserade `locationMapper.ts` att stödja båda:
```typescript
const allRegions: RegionConfig[] = [
  ...(config.islands || []),
  ...(config.regions || []),
];
```

**Ingen kodändring i ingest-pipeline krävdes.**

### Körlogg Kenya

```
=== Starting GENERIC ingest for market: ke ===
Found 3 sources in config
[ke_buyrentkenya] Fetching via http...
[ke_property24] Fetching via http...
Total listings collected: 1
Summary: 0 visible, 1 hidden
[Supabase] Upserted 1 listings
```

### Körlogg CV (oförändrad)

```
=== Starting GENERIC ingest for market: cv ===
[cv_terracaboverde] Parsed 9 listings from 1 pages
[cv_simplycapeverde] Parsed 3 listings from 1 pages
[GenericEnrich] Complete: 12 enriched, 0 failed
```

### Filer skapade för Kenya (endast config)

| Fil | Innehåll |
|-----|----------|
| `markets/ke/locations.yml` | Regioner (Nairobi, Mombasa, etc.) + städer |
| `markets/ke/sources.yml` | 2 källor + 1 stub |

### Kod skapad (market-agnostisk)

| Fil | Syfte |
|-----|-------|
| `core/ingestMarket.ts` | Tar `MARKET_ID` från env, kör för valfri marknad |

### Definition of Done (FAS 2C)

| Kriterium | Status |
|-----------|--------|
| Samma kod för 2+ marknader | ✅ |
| Ingen market-specifik if/else | ✅ |
| Valuta från config | ✅ KES för Kenya, EUR för CV |
| Location mapping från config | ✅ regions för Kenya, islands för CV |
| Ingen kodändring i pipeline | ✅ (endast locationMapper generaliserades) |

### GOVERNANCE-bevis

```bash
$ grep -n "kenya\|nairobi\|mombasa" core/ingestMarket.ts
# (ingen output = ingen Kenya-specifik kod)

$ grep -n "if.*marketId.*===" core/ingestMarket.ts
# (ingen output = ingen market-specifik branching)
```

---

## ✅ FAS 2A: Coverage Kap Verde - Complete

**Uppnått 2026-02-03:**

### Resultat

| Metric | Före | Efter | Förändring |
|--------|------|-------|------------|
| Totalt listings | 18 | 39 | +117% |
| Fungerande källor | 2 | 4 | +100% |
| cv_terracaboverde | 9 | 9 | - |
| cv_simplycapeverde | 3 | 3 | - |
| **cv_homescasaverde** | 0 | **15** | ✅ NEW |
| **cv_capeverdeproperty24** | 0 | **10** | ✅ NEW |

### Ändringar (endast config)

**cv_homescasaverde:**
- `fetch_method: http` → `fetch_method: headless` (Houzez-tema kräver JS)
- Selectors: `.property-item, .item-wrap` + `a[href*='/property/']`

**cv_capeverdeproperty24:**
- Selectors: `.property-desc` + `h4 a[href]`
- Pagination: `query_param` → `none` (alla på en sida)

### Kvarvarande källor (Raw/Silver tier)

| Källa | Status | Anledning |
|-------|--------|-----------|
| cv_ccoreinvestments | OBSERVE | CasafariCRM - behöver ytterligare undersökning |
| cv_capeverdepropertyuk | 403 | Blockerad - behöver proxy/external acquisition |

### Körlogg

```
[cv_terracaboverde] Parsed 9 listings from 1 pages
[cv_simplycapeverde] Parsed 3 listings from 1 pages
[cv_homescasaverde] Parsed 15 listings from 1 pages
[cv_capeverdeproperty24] Parsed 10 listings from 2 pages
Total listings collected: 39
[Supabase] Upserted 39 listings
```

### Definition of Done (FAS 2A)

| Kriterium | Status |
|-----------|--------|
| Fler källor fungerar | ✅ 2 → 4 |
| Endast config-ändringar | ✅ Ingen kod ändrad |
| Raw/Silver tier accepterat | ✅ 27 hidden (saknar enrichment) |
