# `sources.yml` Config Reference

Version 1.0 | 2026-05-12

Companion to:
- `docs/operations/adding-a-source.md` — the workflow that uses these options
- `docs/operations/source-troubleshooting.md` — symptom → option mapping when something breaks

Every option below is read by the engine in `core/configLoader.ts` → `core/genericFetcher.ts` → `core/detail/plugins/genericDetail.ts`. Source authors only edit `markets/{market}/sources.yml`. If you find a need the catalog doesn't cover, see `docs/operations/adding-a-source.md` § 4 "When to extend the engine".

---

## 1. Identity & lifecycle

| Option | Type | Description |
|---|---|---|
| `id` | string, required | Unique per market. Convention: `{market}_{slug}`, e.g. `cv_ccoreinvestments`. |
| `name` | string | Human-readable name, used in logs. |
| `url` | string, required | The list URL. Should be the language variant whose **list-card titles** you want. |
| `type` | `"html"` or `"json"` | Almost always `html`. |
| `lifecycleOverride` | `"IN"` \| `"DROP"` \| absent | `DROP` halts the pipeline for this source. |
| `fetch_method` | `"http"` \| `"headless"` | `http` for server-rendered HTML. `headless` only when the site needs JS execution (slower, requires Playwright). |

---

## 2. Listing identity (ids stable across runs)

| Option | Type | Description |
|---|---|---|
| `id_prefix` | string | Prepended to the per-listing id. Convention: site nickname (`ccore`, `homes`, `nhakaza`). Default: `id` with `cv_` stripped. |
| `id_url_pattern` | regex string, one capture group | When the detail URL contains a stable numeric segment (common with CRM-backed sites), use this to derive the row id from the URL instead of `md5(title\|price\|url)`. **Critical for sites with multiple language variants** — otherwise the same listing under two slugs gets two different ids. Example: `'/(\d+)(?:[/?#]|$)'`. |

**ID derivation order:**
1. `item_map.id` (only for `pagination.type: json_api` sources)
2. `id_url_pattern` match against the detail URL
3. `md5(title \| price \| detailUrl)` hash, truncated to 12 chars

So `id_url_pattern` takes precedence over the hash. The hash is only the last resort.

If you change a source from "no `id_url_pattern`" to "has `id_url_pattern`" after rows exist, run a one-shot migration to rename existing ids (see `scripts/migrate_ccore_ids.ts` as the template).

---

## 3. Pagination

| Option | Type | Description |
|---|---|---|
| `pagination.type` | `"query_param"` \| `"path_segment"` \| `"json_api"` | How to construct the URL for page N. |
| `pagination.param` | string | (query_param only) Name of the page parameter, e.g. `"page"`. |
| `pagination.pattern` | string | (path_segment only) Template like `"/page/{page}/"`. |
| `pagination.start` | int | First page number (usually `1`, occasionally `0`). |
| `pagination.first_no_param` | bool | `true` if page 1 is the bare URL (no `?page=1`). |
| `delay_ms` | int | Between-page delay. `2500` is a safe default. |
| `jitter_ms` | int | Random additional delay up to this many ms. Anti-rate-limit. |
| `max_items` | int | Hard cap on total listings fetched. |
| `max_pages` | int | Hard cap on pages crawled. |
| `stop_condition` | `"empty_listings"` \| `"max_pages"` \| `"duplicate_listings"` | When to stop pagination. `empty_listings` (stop on first empty page) is the most common. |
| `reject_url_patterns` | regex string\[\] | Detail URLs matching any of these are discarded. Use for "agent profile" links that look like detail URLs. |

---

## 4. List-page selectors

These run against each page of the list URL.

| Option | Type | Description |
|---|---|---|
| `selectors.listing` | CSS selector | The container element repeated per card. Must be unique to cards (don't use `div.item` if `div.item` also appears in the header). |
| `selectors.link` | CSS selector | Optional. The anchor whose `href` is the detail URL. Omit if the listing container IS the anchor. |
| `selectors.title` | CSS selector | Within each card. |
| `selectors.price` | CSS selector | Within each card. |
| `selectors.location` | CSS selector | Within each card. Optional but recommended — `parseLocation()` uses this. |
| `selectors.image` | CSS selector | Within each card. Used to capture the thumbnail. Whole-page image extraction happens in detail enrichment, not here. |
| `min_path_segments` | int | Reject hrefs with fewer than N path segments. Filters out `/about`, `/contact`. |

---

## 5. Price formatting

```yaml
price_format:
  currency_symbol: "€"
  thousands_separator: " "   # space, "." or ","
  decimal_separator: ","
  multiplier: 1              # rarely needed (e.g. set 1000 if prices shown in thousands)
```

When set, the engine uses an explicit parser (`parseConfiguredPrice` in `genericDetail.ts`) for detail-page prices. Without it, the engine falls back to a heuristic parser. The explicit parser is strictly more reliable — set this whenever you know the format.

Common variants:
- European with non-breaking space: `thousands: " "`, `decimal: ","`  → "384 748 €"
- European with dot: `thousands: "."`, `decimal: ","`  → "€130.000"
- US: `thousands: ","`, `decimal: "."`  → "$250,000"

---

## 6. Location

| Option | Type | Description |
|---|---|---|
| `location_patterns` | regex string\[\] | Patterns applied to the location text from list cards. The first match wins. |

Market-level location resolution lives in `markets/{market}/locations.yml` and `markets/{market}/locationHooks.ts`. Source-level `location_patterns` is for sites whose location strings need normalisation before the market resolver sees them.

---

## 7. Detail enrichment

Top-level:

```yaml
detail:
  enabled: true
  policy: always   # or "on_violation"
  delay_ms: 2500
```

| Option | Type | Description |
|---|---|---|
| `detail.enabled` | bool | Master switch. |
| `detail.policy` | `"always"` \| `"on_violation"` | `always`: enrich every listing. `on_violation`: only when description is missing/short or fewer than 3 images. |
| `detail.delay_ms` | int | Between-detail-fetch delay. |
| `detail_url_rewrite` | `{ from, to }` | Regex substitution applied to detail URLs after extraction. Use when list cards link to the wrong language variant of the detail page (see CCore: cards on `/en/list` link to `/property-detail/` instead of `/en/property-detail/`). |

### 7.1 Detail selectors

```yaml
detail:
  selectors:
    description: "..."
    images:      "..."
    bedrooms:    "..."     # icon-based override; optional
    bathrooms:   "..."     # icon-based override; optional
    location:    "..."     # optional, overrides list-card location
    price:       "..."     # optional, overrides list-card price
```

**`description`** — narrow selector for the property's prose. Multiple selectors joined by `, ` are OR'd. The engine concatenates all matching elements' text.

**`images`** — the most important selector to get right. Loose selectors capture site chrome (logos, navigation) and related-listing thumbnails. Tight selectors fix both.

Guidelines:
- Open the detail page in a browser, inspect the gallery, find the gallery container's id or class.
- Prefer selectors that target the gallery wrapper: `#js-gallery__list img` (CCore), `.swiper-slide img.property-photo` (generic carousel), `.gallery-container .photo`.
- Avoid `img[src*='cdn.somewhere.com']` alone — same CDN often serves multiple listings on the same page (related listings).
- Multiple selectors comma-joined are OR'd: `"#js-gallery__list img, .gallery__img"` catches both a hidden `<ul>` of all photos and a visible collage of three.

The engine has defense-in-depth image filtering on top of your selector (see § 8), but selector precision is the primary mechanism.

**`bedrooms` / `bathrooms`** — icon-based spec extraction. Many real-estate sites render specs as `<i class="fa-shower"></i><span>3</span>` with no text label near the number. Body-text regex (`spec_patterns`) can't extract these. Configure a selector to target the `<span>` directly:

```yaml
  bedrooms:  ".detailsBar__list i.fa-bed + span"
  bathrooms: ".detailsBar__list i.fa-shower + span"
```

The engine runs `spec_patterns` first; if a field is still null, it falls back to these selectors and matches the first integer in the captured text.

### 7.2 Spec patterns (body-text regex)

```yaml
detail:
  spec_patterns:
    bedrooms:
      - "(\\d+)\\s*(?:Bedrooms?|Beds?|Quartos?|Chambres?)"
      - "\\bT(\\d+)\\b"                        # T2, T3 etc
    bathrooms:
      - "(\\d+)\\s*(?:Bathrooms?|Baths?)"
    area:
      - "(\\d+(?:[.,]\\d+)?)\\s*(?:m[²2]|sqm|metros?\\s*quadrados?)"
    parking:
      - "(\\d+)\\s*(?:parking|garage)"
```

Each pattern must have exactly one capture group containing the digit(s). YAML double-escapes (`\\d`) because the strings become JS regex sources.

The patterns are tried in order. First match wins. Per-field sanity checks (engine-applied):

- bedrooms: 0 < N < 20
- bathrooms: 0 < N < 20
- parking: 0 ≤ N < 20
- area: any positive number

### 7.3 Amenity keywords

```yaml
detail:
  amenity_keywords:
    pool:             ["pool", "piscina", "swimming"]
    sea_view:         ["sea view", "vista mar"]
    balcony:          ["balcony", "varanda"]
    air_conditioning: ["air conditioning", "ar condicionado", "a/c"]
    parking:          ["parking", "garage", "estacionamento"]
```

The amenity keys are arbitrary (you can invent new ones; they end up in `listing.amenities` as a string array). The values are case-insensitive substrings searched in the description text. The engine applies a 5-word negation window: "no pool" or "without pool" does not match `pool`.

---

## 8. Image filtering (engine-level, not configurable per source)

For reference — these run after your `selectors.images` matches, and are why precise selectors matter (defense doesn't compensate for an over-broad selector).

In `core/detail/plugins/genericDetail.ts`:

- **`INVALID_IMAGE_PATTERNS`** — URLs containing `logo`, `icon`, `sprite`, `placeholder`, `default`, `avatar`, `loading`, `spinner`, `blank.`, `1x1.`, `pixel.`, `spacer`, `emoji`, `smiley`, `wp-includes` are rejected.
- **`SMALL_IMAGE_PATTERNS`** — URLs with `width=N` or `w=N` where N is 1–199, or `-NxN.` / `/NxN/` thumbnail-size paths, are rejected.
- **`isChromeElement`** — `<img>` whose class or alt matches `header_`, `footer_`, `nav_`, `brand_`, `\blogo\b`, `\bicon\b`, `favicon` is skipped. Catches header logos whose URL is an opaque CDN UUID with no "logo" substring.

In `core/genericFetcher.ts → dedupeImageUrls`:

- WordPress-style size variants (`photo-1024x768.jpg` and `photo.jpg`) are grouped; the largest (or the un-suffixed original) is kept.
- Query params and hashes are stripped before deduping.
- Protocol normalised to `https:`.

These are tuned for the sources we've onboarded so far. If you find a legitimate property URL being filtered out, see `docs/operations/source-troubleshooting.md` § "Property images being filtered" before tweaking the engine.

---

## 9. Full worked example (CCore Investments)

```yaml
- id: cv_ccoreinvestments
  name: "CCore Investments"
  url: https://www.ccoreinvestments.com/en/list
  type: html
  lifecycleOverride: IN
  fetch_method: http

  pagination:
    type: query_param
    param: "page"
    start: 1
    first_no_param: false

  delay_ms: 2500
  jitter_ms: 1000
  max_items: 200
  max_pages: 15
  stop_condition: empty_listings

  selectors:
    listing: "a.propertyItemStyle11"
    title:   "h3.propertyItemStyle11__title"
    price:   "span.propertyItemStyle11__price"
    location: "h4.propertyItemStyle11__subTitle"
    image:   "img.propertyItemStyle11__img"

  price_format:
    currency_symbol: "€"
    thousands_separator: " "
    decimal_separator: ","

  id_prefix: "ccore"
  id_url_pattern: '/(\d+)(?:[/?#]|$)'

  detail_url_rewrite:
    from: '/property-detail/'
    to:   '/en/property-detail/'

  detail:
    enabled: true
    policy: always
    delay_ms: 2500
    selectors:
      description: ".contentText, .js-cmsContent"
      images: "#js-gallery__list img, .gallery__img"
      bedrooms:  ".detailsBar__list i.fa-bed + span"
      bathrooms: ".detailsBar__list i.fa-shower + span"
    spec_patterns:
      bedrooms:
        - "(\\d+)\\s*(?:Bedrooms?|Beds?|Quartos?)"
        - "\\bT(\\d+)\\b"
      bathrooms:
        - "(\\d+)\\s*(?:Bathrooms?|Baths?|Casas?\\s*de\\s*banho)"
      area:
        - "(\\d+(?:[.,]\\d+)?)\\s*(?:m[²2]|sqm)"
    amenity_keywords:
      pool: ["pool", "piscina"]
      sea_view: ["sea view", "vista mar"]
      balcony: ["balcony", "varanda"]
      garden: ["garden", "jardim"]
      parking: ["parking", "garage"]
```

Decisions in this config that aren't obvious:

- `url: /en/list` — English titles on cards.
- `id_url_pattern` — stable id derived from the trailing numeric segment, so swapping `/en/list` for `/lista-propriedades` later doesn't create duplicates.
- `detail_url_rewrite` — list cards link to `/property-detail/` (PT) but the EN detail page lives at `/en/property-detail/`. Rewrite pins enrichment to EN, which makes the description English and lets the bathroom regex `\d+\s*Bathrooms?` actually match.
- `selectors.images: "#js-gallery__list img, .gallery__img"` — the dedicated gallery, not `img[src*='cdn.proppy.app']`. The CDN-domain selector also matches related-listing thumbnails on the page.
- `selectors.bedrooms` / `selectors.bathrooms` — required because Proppy renders specs as icons + numbers with no text label. Without these, bathroom coverage on CCore is ~28%. With them, ~95%.
