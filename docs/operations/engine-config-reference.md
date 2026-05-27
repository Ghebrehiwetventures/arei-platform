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
| `pagination.type` | `"query_param"` \| `"path_segment"` \| `"ajax_post"` \| `"click_next"` \| `"json_api"` \| `"none"` | How to construct the URL for page N. `json_api` posts a JSON body and reads pages from `$skip` / `$top` semantics or numeric `page`. |
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

### How the resolver matches aliases

`parseLocation()` in `core/locationMapper.ts` walks the YAML aliases in two passes (cities first, then regions) and tests each alias with a **Unicode-aware word-boundary regex** — `(?<![\p{L}\p{N}])alias(?![\p{L}\p{N}])` with the `iu` flags.

Naive substring matching used to live here and caused real production bugs:
- `Paul` (city on Santo Antão) matched `São Paulo` (area in Santa Maria, Sal)
- `Sal` (island) matched every listing title containing `for sale`
- `Praia` (city on Santiago, the capital) matched `Praia António Sousa` (area in Santa Maria, Sal)

If you add a new alias, prefer the longest/most-specific form ("Cidade da Praia" rather than "Praia") so word-boundary matching has good signal. Single-word aliases that are common substrings of unrelated place names will still false-positive within their own region.

### List-card location selectors with multiple links

The engine joins **all** elements matched by `selectors.location`, not just `.first()`. Sites like op24 split the location into stacked links inside one container (e.g. `<a>São Paulo</a> <a>Santa Maria</a>`). Joining them with `", "` gives the resolver enough context to disambiguate — without this, `São Paulo` alone yields no match, and falling through to the title rarely helps.

If your selector accidentally over-matches (e.g. `a` inside the container catching unrelated link text), scope it tighter — `.property_location_image a` not `.property_location_image *`.

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

### 7.2 Spec patterns (regex on a scoped text)

```yaml
detail:
  specs_selector: ".listing_detail"        # optional but recommended
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

**Scoping the regex text (`specs_selector`).** Without it, the engine runs each pattern against `$("body").text()` — the entire rendered page. That includes navigation, "Similar Listings" / "Other properties" sidebars, footer, URL fragments, etc. The first regex match wins, so an unrelated `2-Bedroom Apartment` in a sidebar pollutes the field. Real example: an op24 studio listing got `bedrooms = 9` because the regex matched a number in a `%20Bedje` URL fragment.

Resolution order for the text the regex sees:

1. `detail.specs_selector` if set — the engine reads `$(specs_selector).text()`.
2. Else the description text from `detail.selectors.description` (if it returned ≥50 chars).
3. Else the full `$("body").text()` (legacy fallback).

Use `specs_selector` whenever the site has a discrete spec box (`.listing_detail`, `.property-features`, `.detailsBar`, `#js-spec-list`, etc.). It is the cleanest source-side defense against bleed-through from related listings. The fallbacks exist so older configs without `specs_selector` keep working.

### 7.3 Label/value spec table (`spec_table`)

Some sites present specs as structured label/value pairs rather than prose (Houzez `.listing-details-detail`, Elementor widgets with `span.pre-data`, classic `<dl><dt><dd>` definition lists, Proppy/CasafariCRM tables). Regex-on-prose (`spec_patterns`) misses these — the value usually isn't adjacent to the label in the rendered text.

```yaml
detail:
  spec_table:
    container: ".elementor-widget"            # nodes to scan
    label_selector: "span.pre-data"           # element whose text IS the label
    # value_selector — optional. Forms:
    #   "+ dd"           → next sibling matching dd
    #   "~ .value"       → following sibling matching .value
    #   ".some-class"    → descendant of the label's parent
    # If omitted, value = closest <li/tr/p/div> text minus the label text.
    value_selector: "+ dd"
    label_map:
      bedrooms: ["bedrooms", "quartos", "beds"]
      bathrooms: ["bathrooms", "casas de banho"]
      parking:  ["parking spaces", "garage"]
      area:     ["area", "área", "terrace area"]
      price:    ["price", "preço", "precio"]
```

Resolution order for each spec field:
1. `detail.selectors.{bedrooms,bathrooms}` (CSS direct, highest priority)
2. `detail.spec_table` (this section)
3. `detail.spec_patterns` (regex on body/description text)

Label matching is case-insensitive — an alias matches if `label.toLowerCase()` equals the alias or contains it. Numeric values are read via `\b(\d{1,3})\b` and rejected if outside 0–19 (for beds/baths/parking). Area accepts decimals. Price values go through the same `parseConfiguredPrice` / `parseGenericPrice` pipeline as `selectors.price`.

### 7.4 Amenity keywords

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
- **`isChromeElement`** — `<img>` whose class, alt, **or src filename** matches `header_`, `footer_`, `nav_`, `brand_`, `\blogo\b`, `\bicon\b`, `favicon`, `\bsymbol\b`, `\bwatermark\b` is skipped. The filename branch also catches `-symbol.png`, `-logo-*`, `site-logo`, etc. so brand assets embedded inline in `description` prose (e.g. `Gamma-symbol.png` on estatecv) don't leak into `image_urls`.

In `core/genericFetcher.ts → dedupeImageUrls`:

- WordPress-style size variants (`photo-1024x768.jpg` and `photo.jpg`) are grouped; the largest (or the un-suffixed original) is kept.
- Query params and hashes are stripped before deduping.
- Protocol normalised to `https:`.

These are tuned for the sources we've onboarded so far. If you find a legitimate property URL being filtered out, see `docs/operations/source-troubleshooting.md` § "Property images being filtered" before tweaking the engine.

---

## 9. JSON API sources (`type: json_api`, `pagination.type: json_api`)

For sites whose listings come from a structured API (REMAX, Sotheby's IS, Properstar, anything Azure-Search-backed) — skip HTML parsing entirely. The engine talks to the JSON endpoint and maps fields by dot-path.

```yaml
pagination:
  type: json_api
  method: POST
  page_mode: skip          # Azure Search uses $skip/$top semantics
  page_size: 20
  page_field: skip         # body field name for the offset
  size_field: top          # body field name for the size
  items_path: value        # dot-path to the hits array in the response
  count_path: "@odata.count"
  body:
    search: "*"
    filter: "content/ListingCountryCode eq 'CV' and content/IsFindable eq true"
    count: true
```

`item_map` then projects each hit into a `ParsedListing`. Dot-paths resolve inside `content_base`. Templates use `{field}` and `{VALUE}` placeholders.

```yaml
item_map:
  content_base: content
  id: MLSID
  title:                              # primary: array-pick by matchers
    array: ListingDescriptions
    field: Description
    matches:
      - field: ISOLanguageCode
        equals: en
      - field: DescriptionTypeUID
        equals: "1113"
  title_fallbacks:                    # tried in order if `title` is empty
    - array: ListingMetaTags
      field: MetaTitle
      match_field: LanguageCode
      match_value: en-US
  price: ListingPriceEuro
  bedrooms: NumberOfBedrooms
  bathrooms: NumberOfBathrooms
  area_sqm: TotalArea
  location_template: "{City}, {Province}"
  skip_if:
    - field: HidePricePublic
      equals: true                    # drop "price on request" rows. Omit to keep them as price=null.
  description:
    array: ListingDescriptions
    field: Description
    match_field: ISOLanguageCode
    match_value: en
  detail_url:
    array: ShortLinks
    field: ShortLink
    match_field: ISOLanguageCode
    match_value: en
    template: "https://www.example.com/{VALUE}"
  images:
    array: ListingImages
    field: FileName
    sort_by: Order                    # the agent's display sequence; image_urls[0] becomes the hero
    template: "https://cdn.example.com/path/{VALUE}"
    # limit: 100                      # optional; default 100 (effectively uncapped)
```

### Array-pick spec (`ItemMapArrayPick`)

| Option | Description |
|---|---|
| `array` | Dot-path to the array field on the item. |
| `field` | Field name on each element whose value we extract. |
| `match_field` + `match_value` | Pick the first element whose `match_field == match_value`. Shorthand for a single equality. |
| `matches[]` | Pick the first element matching **every** `{field, equals}` pair. Use when you need an AND across multiple conditions (e.g. English language AND short-title type). |
| `template` | Apply to the extracted value, replacing `{VALUE}`. Use for CDN URL templates and absolute-URL construction. |
| `sort_by` | Sort the array by this field (numeric ascending, missing keys go to end) before picking. Use when the source API doesn't return elements in display order — REMAX's `ListingImages` returns `Order=1` in arbitrary positions, so `sort_by: Order` makes `image_urls[0]` actually match the hero on remax.cv. |
| `limit` | For `all: true` arrays, cap the number returned. Default `100`. |
| `all` | Used internally by the engine for `images`. Returns the whole array as a string\[\]. |

### Title and description selection

- `title_template` — string template with `{field}` placeholders into the item. Wins over `title`.
- `title` — either a dot-path string, or an `ItemMapArrayPick` (typed array selection by language/role).
- `title_fallbacks` — ordered list tried when `title` yields an empty/missing value. Same shape as `title`.

The order is `title_template` → `title` → fallbacks in array order. This lets a config say "prefer the English short-description; if it's missing, fall back to the meta title" without writing per-source code.

### `skip_if`

Skip a hit when any rule's `getByPath(item, rule.field) === rule.equals` holds. Used in REMAX to drop `HidePricePublic: true` upstream (or, equivalently, omit `skip_if` and let the engine coerce `ListingPriceEuro: 0` to `price: undefined` — the public feed contract treats price as optional, see `docs/FEED_CONTRACT.md`).

---

## 10. Full worked example (CCore Investments)

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
