# Architecture – Africa Property Index

## High-Level Overview

Africa Property Index är en **YAML-driven property ingestion pipeline** som bevisar att samma kod kan normalisera fastighetsdata från flera afrikanska länder utan kodändringar.

```
┌─────────────────────────────────────────────────────────────┐
│                       CONFIG LAYER                           │
│  markets/{market}/sources.yml + locations.yml                │
│  - Selectors, pagination, CMS type                           │
│  - Detail extraction patterns                                │
│  - Location mapping (islands/regions/cities)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      GENERIC LAYER                           │
│  core/genericFetcher.ts + genericDetailExtractor.ts          │
│  - CMS presets (Elementor, WordPress, Wix, etc.)             │
│  - Pagination auto-detection                                 │
│  - Spec pattern matching (bedrooms, bathrooms, etc.)         │
│  - Amenity keyword detection                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     INGEST LAYER                             │
│  core/ingestMarket.ts                                        │
│  - Market-agnostic ingestion loop                            │
│  - Dedup via fingerprint (dedup_key)                         │
│  - Golden rules enforcement (visibility)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                            │
│  Supabase (PostgreSQL)                                       │
│  - Normalized schema (listings, sources, markets)            │
│  - Dedup observability triggers                              │
│  - Lifecycle management (IN, OBSERVE, DROP)                  │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. **Zero Source-Specific Code**
Ingen if-statement för enskilda källor eller länder i core-koden.

**Förbjudet:**
```typescript
if (source.id === "cv_terracaboverde") {
  // special logic
}
```

**Tillåtet:**
```yaml
# sources.yml
detail:
  enabled: true
  policy: always
```

### 2. **CMS Presets för Fallbacks**
Varje källa kan specificera en `cms_type` (elementor, wordpress, wix, etc.). Om selectors saknas fylls de i från presets.

**Exempel:**
```yaml
cms_type: elementor
selectors:
  listing: ".e-loop-item"  # Explicit
  # title, price, image → använder elementor preset
```

### 3. **Config-Driven Detail Extraction**
Inga plugins eller hårdkodad detail-logik. Allt styrs via YAML:

```yaml
detail:
  selectors:
    description: "h2:contains('Description') + .elementor-widget-text-editor"
    images: ".swiper-slide img"
  spec_patterns:
    bedrooms:
      - "(\\d+)\\s*(?:Bedrooms?|Quartos?)"
    bathrooms:
      - "(\\d+)\\s*(?:Bathrooms?|Banheiros?)"
  amenity_keywords:
    pool: ["pool", "piscina"]
    sea_view: ["sea view", "vista mar"]
```

### 4. **Location Mapping via Config**
Olika marknader använder olika geografi (islands vs regions). Allt mappas via `locations.yml`:

```yaml
# CV: islands
islands:
  - name: Sal
    cities:
      - name: Santa Maria

# KE: regions  
regions:
  - name: Nairobi
    cities:
      - name: Westlands
```

**Kod hanterar båda:**
```typescript
const allRegions = [
  ...(config.islands || []),
  ...(config.regions || []),
];
```

### 5. **Pagination Auto-Detection**
Pipeline försöker auto-detect pagination från HTML:
- Query params (`?page=2`, `?e-page=3`)
- Click-based (next button)
- Infinite scroll

Fallback till explicit config om auto-detection misslyckas.

## Key Components

### `ingestMarket.ts`
Main entrypoint. Tar `MARKET_ID` från env, läser config, kör för alla källor.

**Zero market-specific logic.**

```bash
MARKET_ID=cv ts-node core/ingestMarket.ts
MARKET_ID=ke ts-node core/ingestMarket.ts
# Samma kod!
```

### `genericFetcher.ts`
- Läser `sources.yml`
- Mergar med CMS presets
- Hanterar pagination (http eller headless)
- Returnerar rå listings

### `genericDetailExtractor.ts`
- Läser detail-config från YAML
- Extraherar description, images, specs (bedrooms, bathrooms)
- Detekterar amenities via keywords
- Negation guard (undviker "no pool" → pool)

### `locationMapper.ts`
- Läser `locations.yml`
- Matchar islands/regions/cities via aliases
- Returnerar normaliserat format

### `cmsPresets.ts`
Fallback-selectors för vanliga CMS:

| CMS | Selector Preset | Pagination Default |
|-----|----------------|-------------------|
| Elementor | `.e-loop-item`, `.elementor-heading-title` | `?e-page=` |
| WordPress | `.wp-post`, `.wp-post-image` | `?paged=` |
| Wix | `[data-hook]`, `wix.com` | Next link |
| Custom | Generic fallbacks | `?page=` |

## Data Flow

```
1. Read sources.yml for market
2. For each source:
   a. Merge with CMS preset
   b. Fetch listings (genericFetcher)
   c. If detail.enabled: enrich (genericDetailExtractor)
   d. Parse location (locationMapper)
   e. Generate fingerprint (dedup_key)
3. Golden rules check (price, description, images)
4. Upsert to Supabase (dedup on dedup_key)
5. Generate report (visible %, coverage %)
```

## Golden Rules (Visibility)

En listing är **visible** om den uppfyller:

| Rule | Requirement |
|------|-------------|
| Price | Måste finnas och vara >0 |
| Description | Minst 50 tecken |
| Images | Minst 3 images |

Om någon regel bryts: `lifecycle = "OBSERVE"` (hidden).

## Deduplication

**Fingerprint:** `dedup_key = sha256(title + price + source_path)`

**Strategi:**
- Listings med samma `dedup_key` = duplicat
- Upsert på `dedup_key` (senaste vinner)
- Observability triggers i Supabase loggar dedup-händelser

## Why This Is a Moat

### 1. **Genericitet Bevisad**
Inga konkurrenter har lyckats köra samma pipeline över 5+ afrikanska marknader utan kodändringar.

### 2. **Speed to Market**
Nya marknader = 15-30 min YAML-config vs 2-4 veckor kodning (konkurrenter).

### 3. **Data Quality**
91% visible % vs industri ~60-70%. Bättre detail extraction genom config-driven patterns.

### 4. **Skalbarhet**
Samma kod för 10, 20, 50 marknader. Linear cost scaling (inte exponential).

## Limitations (Honest)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **SPAs without SSR** | Auto-detection misslyckas | Headless + längre delays |
| **Cloudflare/anti-bot** | Blockade requests | External acquisition layer |
| **Obfuscated selectors** | CSS modules randomiserar | Manual config fallback |
| **Complex pagination** | Auto-detection 80% success | Explicit config i YAML |

## Tech Stack

- **Runtime:** Node.js (TypeScript)
- **Fetching:** Axios (http), Puppeteer (headless)
- **Parsing:** Cheerio (HTML)
- **Storage:** Supabase (PostgreSQL)
- **Config:** YAML
- **AREI Admin:** React + Vite (`arei-admin` app)

## Next Architecture Steps

- [ ] External acquisition layer (Browserless, ScrapingBee)
- [ ] Image quality scoring integration
- [ ] Real-time dedup observability dashboard
- [ ] API layer för external consumers
- [ ] Multi-tenancy (flera org:s, samma pipeline)
