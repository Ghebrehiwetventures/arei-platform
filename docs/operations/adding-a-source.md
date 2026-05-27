# Adding a Source to `kv_curated`

Version 1.0 | 2026-05-12

Companion to:
- `docs/operations/engine-config-reference.md` — every `sources.yml` option, with examples
- `docs/operations/source-troubleshooting.md` — symptom → diagnosis recipes
- `docs/operations/execution-protocol.md` — repo-wide execution rules (truth hierarchy, verification)
- `docs/superpowers/specs/2026-05-11-ccore-ingest-to-curated-design.md` — original design for the ingest script (the worked example)

This is the playbook for getting a new source's listings into `kv_curated.listings` and onto the live KazaVerde feed. It assumes the source has already been scoped in `markets/{market}/sources.yml` at a minimum (id, name, url, lifecycle).

The pipeline is generic. Source-specific behavior lives in YAML, not in code. If you find yourself wanting to write a per-source `.ts` plugin, stop — extend the engine instead. See "When to extend the engine" below.

---

## 1. Hard rules (do not violate)

From `docs/superpowers/specs/2026-05-11-ccore-ingest-to-curated-design.md` and `docs/operations/execution-protocol.md`:

- **Use `createPostgresClient()` + `DATABASE_URL`** for any write to `kv_curated`. Never Supabase REST or Supabase JS.
- **Insert as `needs_review` first.** Never write `publish_status='published'` directly from the pipeline.
- **The upsert is status-gated.** Already-published rows are immutable from the pipeline. Don't bypass.
- **Documentation never overrides live state.** If a doc says "field X is always set" but a sample row shows it null, the row is truth.
- **Spot-check before promoting.** Every promotion to `published` is a production change.

---

## 2. Workflow overview

```
  Phase 1   Verify the source's current state in DB
     │
  Phase 2   Identify the right list URL (language, pagination)
     │
  Phase 3   Configure or refine sources.yml (listing-level)
     │
  Phase 4   First fetch test — list page only, DRY_RUN=1
     │
  Phase 5   Configure detail enrichment selectors
     │
  Phase 6   Full DRY_RUN — inspect coverage stats
     │
  Phase 7   Real run — writes to kv_curated as needs_review
     │
  Phase 8   Spot-check 5 rows in DB
     │
  Phase 9   Promote to published (manual SQL)
```

Each phase has an explicit exit criterion. Do not skip ahead.

---

## 3. Phase-by-phase

### Phase 1 — Verify current state

Before fetching anything, find out what's already in the DB for this source.

```sql
SELECT publish_status, count(*)
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}'
GROUP BY publish_status;
```

Possible outcomes:

- **Nothing in DB** — fresh source. Proceed.
- **Rows in `needs_review`** — an earlier ingest happened. The upcoming run will upsert them.
- **Rows in `published`** — these are live on the feed. The status-gate protects them; your run will be a no-op for those ids. If you need to re-enrich one, demote it first:
  ```sql
  UPDATE kv_curated.listings SET publish_status='needs_review' WHERE id='...';
  ```

**Exit criterion:** you know how many rows the source currently has in each status.

### Phase 2 — Identify the right list URL

The biggest single failure mode is fetching the wrong language variant. Many bilingual real-estate sites have:

- `/en/list` (English UI, English titles on cards)
- `/listings`, `/listagem`, `/lista-propriedades` (default language)
- Detail pages at `/en/property-detail/...` and `/property-detail/...`

And the language variants are not always consistent — for example, an English list-card may link to the Portuguese detail page (CCore Investments does this).

```bash
curl -sL "{candidate_url}" -A "Mozilla/5.0" -o /tmp/probe.html
grep -oE '<h3[^>]*>[^<]+' /tmp/probe.html | head -5     # titles
grep -oE 'href="[^"]*"' /tmp/probe.html | grep -i 'detail\|propriedade' | head -3   # detail URL pattern
```

Then fetch a sample detail page in **both** language variants:

```bash
curl -sL "{site}/en/property-detail/.../{id}" -A "Mozilla/5.0" | grep -oE '<h1[^>]*>[^<]+'
curl -sL "{site}/property-detail/.../{id}"    -A "Mozilla/5.0" | grep -oE '<h1[^>]*>[^<]+'
```

If the list page's hrefs point at the wrong language variant, you'll need `detail_url_rewrite` (see Phase 5).

**Exit criterion:** you have a list URL whose cards have the language you want, and you know the detail URL pattern for the language you want.

### Phase 3 — Configure `sources.yml` (listing-level)

Minimum viable config for a Proppy/CasafariCRM-style HTML source:

```yaml
- id: cv_yoursource
  name: "Your Source"
  url: https://example.com/en/list
  type: html
  lifecycleOverride: IN
  fetch_method: http   # use "headless" only if the page needs JS execution

  pagination:
    type: query_param
    param: "page"
    start: 1
    first_no_param: false   # true if page 1 has no query param

  delay_ms: 2500
  jitter_ms: 1000
  max_items: 200
  max_pages: 15
  stop_condition: empty_listings

  selectors:
    listing: "a.someClass"            # the container element per card
    title:   "h3.title-class"
    price:   ".price-class"
    location: ".location-class"
    image:   "img.thumb-class"

  price_format:
    currency_symbol: "€"
    thousands_separator: " "
    decimal_separator: ","

  id_prefix: "yoursrc"
  id_url_pattern: '/(\d+)(?:[/?#]|$)'   # see "Stable IDs" below
```

**Stable IDs (`id_url_pattern`):** if detail URLs end in a numeric backend id (e.g. `/property-detail/.../829033`), use this pattern so the same listing resolves to the same row across language variants of the URL. Without it, ids are an md5 of title+price+url, and switching language creates duplicates. See `docs/operations/engine-config-reference.md` for the full rule.

**Listing selector probe:** before writing the YAML, find a unique selector that matches every card on the list page. Open the page in a browser, inspect a card, find a class that uniquely identifies the card container. Verify with:

```bash
grep -oE 'class="[^"]*propertyItemStyle11[^"]*"' /tmp/probe.html | sort -u
```

**Exit criterion:** `sources.yml` validates and the listing selector matches the expected number of cards.

### Phase 4 — First fetch test

Test the list-page extraction in isolation. Temporarily disable detail enrichment in your source config:

```yaml
  detail:
    enabled: false
```

Then run with `DRY_RUN=1` (no AI cost, no DB write):

```bash
DRY_RUN=1 MARKET_ID={market} SOURCE_ID={source_id} \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

The summary at the end shows:
- `Total fetched` — should match what you see on the live site (within reason; allow for pagination edge cases)
- `By island` — every listing got a resolvable location
- `Skipped (...)` — should be 0 or near 0

Common Phase-4 failures and where to look:

- High `Skipped (island unresolved)` → location selector wrong, or location patterns missing for this market. See `docs/operations/source-troubleshooting.md` § "Location unresolved".
- `Total fetched` is half what you see on the site → pagination misconfigured. Check `stop_condition` and `max_pages`.
- 0 listings → listing selector doesn't match. Re-probe with the grep recipe.

**Exit criterion:** list-page fetch returns the expected count with location coverage near 100%.

### Phase 5 — Configure detail enrichment

Detail enrichment fetches each card's detail page to fill in description, images, bedrooms, bathrooms, area, amenities.

Re-enable detail:

```yaml
  detail:
    enabled: true
    policy: always   # or on_violation — see reference
    delay_ms: 2500
    selectors:
      description: ".desc-class, .alt-desc-class"
      images: "{precise gallery selector}"
      bedrooms: "{icon-based span selector if specs are icon-driven}"
      bathrooms: "{same}"
    spec_patterns:
      bedrooms:  ["(\\d+)\\s*(?:Bedrooms?|Beds?)", "\\bT(\\d+)\\b"]
      bathrooms: ["(\\d+)\\s*(?:Bathrooms?|Baths?)"]
      area:      ["(\\d+(?:[.,]\\d+)?)\\s*(?:m[²2]|sqm)"]
```

Two critical things to get right in the detail config:

**(a) Image selector must be precise.** If you write a loose selector like `img`, you'll catch header logos and related-listing thumbnails. Target the actual gallery container — open the detail page, find the gallery wrapper, use its id or class. The generic engine has class-based logo filtering (`isChromeElement`) but it's defense, not the primary mechanism. Examples that work:

```yaml
  images: "#js-gallery__list img, .gallery__img"        # CCore (Proppy)
  images: ".swiper-slide img.property-photo"            # generic carousel
```

**(b) If specs are icon-driven, configure `selectors.bedrooms` / `selectors.bathrooms`.** Many sites render specs as `<i class="fa-shower"></i><span>3</span>` — no text label near the number. Regex on body text can't extract this. Use:

```yaml
  bedrooms:  ".detailsBar__list i.fa-bed + span"
  bathrooms: ".detailsBar__list i.fa-shower + span"
```

The engine tries `spec_patterns` (regex on body text) first, then falls back to these selectors for any field still null.

**Wrong-language detail pages.** If Phase 2 showed the list-card hrefs link to the wrong language variant of the detail page, add a rewrite:

```yaml
  detail_url_rewrite:
    from: '/property-detail/'
    to:   '/en/property-detail/'
```

This is a plain regex substitution applied to every detail URL extracted from the list page.

**Exit criterion:** you've configured selectors against a real detail page (curl + inspect), not guessed.

### Phase 6 — Full DRY_RUN

```bash
DRY_RUN=1 MARKET_ID={market} SOURCE_ID={source_id} \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

This runs fetch + detail enrichment + location resolution but skips AI generation and the DB write. The summary at the end is your coverage report:

```
Field coverage:
  price          88/88 (100%)
  bedrooms       86/88 (98%)
  bathrooms      84/88 (95%)
  images ≥1      88/88 (100%)
  ai_description 0/88 (0%)
```

Targets:
- price: 100% (unless the source intentionally hides prices)
- bedrooms / bathrooms: should be high; ≥80% is healthy; ≥95% for sources with structured specs
- images ≥1: 100%
- ai_description: 0% in DRY_RUN — AI runs in the real-run phase

If any field is below target, **stop and diagnose** before doing the real run. See `docs/operations/source-troubleshooting.md` for the field-by-field diagnosis recipes (especially: "Sparse bathroom coverage", "Images include logos", "Images include other listings").

**Exit criterion:** coverage report meets targets, or any low-coverage field has been confirmed as a genuine data floor (e.g. development-project listings with no per-unit specs).

### Phase 7 — Real run

```bash
MARKET_ID={market} SOURCE_ID={source_id} \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

This:
- fetches + enriches as in Phase 6
- pre-fetches existing rows' `publish_status` and `ai_descriptions IS NOT NULL`
- skips AI generation for rows that are already published OR already have an `ai_descriptions`
- generates AI descriptions for the rest (Claude Sonnet 4.6, GPT-4o fallback)
- upserts into `kv_curated.listings` with `publish_status='needs_review'`

The status-gated upsert means re-running this script is safe — published rows are never modified, and the AI-gate prevents burning credits regenerating descriptions you already have.

**Cost awareness.** AI generation runs only for rows that have a description ≥500 chars and no existing `ai_descriptions`. On a re-run of a fully-AI'd source, AI cost is zero. On a fresh source with ~100 listings, expect roughly 100 Claude Sonnet 4.6 calls (~$0.05–$0.10 total at current pricing).

**Exit criterion:** `[Write] N upserted, 0 failed` and the summary matches Phase 6.

### Phase 8 — Spot-check

Pull 5 rows from the DB and eyeball them. Minimum checks:

```sql
SELECT id, title, image_urls[1], image_urls[array_length(image_urls,1)],
       bedrooms, bathrooms, source_url_primary,
       ai_descriptions IS NOT NULL AS has_ai
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}'
  AND publish_status = 'needs_review'
ORDER BY updated_at DESC
LIMIT 5;
```

What to verify:
- `title` is in the expected language
- `source_url_primary` uses the expected URL pattern (`/en/property-detail/` not `/property-detail/`)
- `image_urls` first entry looks like a real property photo URL, last entry too
- Open `image_urls[1]` in a browser, confirm it's the listing's own photo (not a logo, not another listing's thumbnail)
- `bedrooms`/`bathrooms` non-null where applicable
- `has_ai = true`

Then run the same query without `LIMIT 5` and scan for anomalies (rows with empty `image_urls`, rows where `title` is suspiciously short, etc.).

**Exit criterion:** 5 spot-checked rows are clean; aggregate scan reveals no anomalies.

### Phase 9 — Promote to published

Manual SQL. From `docs/superpowers/specs/2026-05-11-ccore-ingest-to-curated-design.md`:

```sql
-- 1. Count what you're about to promote
SELECT island, count(*)
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}' AND publish_status = 'needs_review'
GROUP BY island;

-- 2. Promote
UPDATE kv_curated.listings
SET publish_status     = 'published',
    first_published_at = now()
WHERE source_id_primary = '{source_id}' AND publish_status = 'needs_review';

-- 3. Verify live feed impact
SELECT source_id, count(*) FROM public.v1_feed_cv GROUP BY source_id ORDER BY source_id;
```

Promotion is a production change. Do not promote in bulk without spot-checking.

---

## 4. When to extend the engine vs. configure the source

Project memory: extend the engine, don't write source-specific plugins. Scalability is paramount.

**Configure in `sources.yml`** when the difference is in:
- CSS selectors (different DOM structure)
- Pagination shape (query param vs. path segment)
- Price formatting (separator characters, currency symbol)
- Image gallery container shape (which div holds the photos)
- URL rewrite for cross-language linking
- ID extraction pattern from URL

**Extend the engine** (`core/genericFetcher.ts`, `core/detail/plugins/genericDetail.ts`, `core/configLoader.ts`) when:
- The site uses a transport you don't support yet (e.g. GraphQL API, sitemap-driven, JS-required where headless can't reach)
- The site has data in a structure no current selector mechanism can express (e.g. data in JSON-LD that we currently don't parse)
- The same shape of problem will recur across many future sources (e.g. "specs hidden behind icons with no label")

If you're tempted to write source-specific code, ask: would three future sources also benefit? If yes, add a config option. If no, you're over-fitting.

`docs/operations/engine-config-reference.md` catalogs every config option the engine currently supports.

---

## 5. Re-ingesting a source already on the public feed

When a source already has `published` rows on `v1_feed_cv` and you need the pipeline
to overwrite them (engine fix, selector change, location-resolver change, new
image filter, etc.) — **do not bulk-demote first and then DRY_RUN**. The
status-gated upsert means demoted rows leave `v1_feed_cv` immediately, and the
DRY_RUN can run for many minutes (especially with `fetch_method: headless`).
While it runs, the source disappears from the public feed.

### Wrong sequence — causes a feed dropout

```
demote all published rows  ──► DRY_RUN (10–60 min)  ──► real ingest  ──► re-promote
        │                            │                       │              │
        └─ feed loses N rows ────────┴───────────────────────┴──────────────┘
                                  feed stays short the whole time
```

This happened on 2026-05-25: 193 op24/ecv/cvp24 rows were demoted before a
multi-source DRY_RUN, and the feed dropped from 425 to 232 listings until the
demote was reversed.

### Correct sequence — feed stays full

```
1. DRY_RUN while rows are still published   (status-gate blocks updates, but the
                                              DRY_RUN doesn't touch the DB anyway)
2. Verify the DRY_RUN coverage / location / images / etc. against expectations
3. Per source, in quick succession:
     demote published rows  ──►  real ingest  ──►  re-promote rows that came back
   Total feed dropout per source: a few minutes at most.
```

Or, when only a handful of rows need updating, target them by id:

```sql
UPDATE kv_curated.listings SET publish_status='needs_review' WHERE id IN ('...','...');
-- then ingest, which upserts the demoted rows
UPDATE kv_curated.listings
SET publish_status='published'
WHERE id IN ('...','...') AND publish_status='needs_review';
```

### Why the status-gate exists

`scripts/ingest_to_curated.ts` upserts with `publish_status='needs_review'` and
the upsert SQL refuses to write over `published` rows. This protects production
from accidental corruption — a bad selector change can't silently rewrite live
listings. Demote-first is the explicit override; treat it as a production change.

### Restoring after an accidental dropout

```sql
UPDATE kv_curated.listings
SET publish_status='published'
WHERE source_id_primary IN ('...')
  AND publish_status='needs_review'
  AND first_published_at IS NOT NULL;
```

The `first_published_at IS NOT NULL` clause restores only rows that were
previously published — not newly-fetched needs_review rows.

## 6. Operational appendix

### Useful one-shots

Re-enrich a single published listing (manual):

```sql
UPDATE kv_curated.listings SET publish_status='needs_review' WHERE id='...';
```

Then re-run the ingest. The status-gated upsert will pick it up.

Bulk demote a source (use with care — see § 5 for the feed-safe sequence):

```sql
UPDATE kv_curated.listings
SET publish_status='needs_review'
WHERE source_id_primary='{source_id}'
  AND publish_status='published';
```

Inspect a source's coverage at a glance:

```sql
SELECT
  count(*)                                      AS total,
  count(price)                                  AS with_price,
  count(bedrooms)                               AS with_beds,
  count(bathrooms)                              AS with_baths,
  count(*) FILTER (WHERE array_length(image_urls,1) > 0) AS with_images,
  count(ai_descriptions)                        AS with_ai
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}';
```

### Don't commit

- `/tmp/*.html` curl outputs
- `scripts/_*.ts` (the leading underscore convention for one-shot diagnostic scripts; delete after use)
- Anything in `scripts/` with `_debug`, `_diag`, `_check`, `_spot` in the name

Real, reusable scripts go in `scripts/` with descriptive names (`scripts/migrate_ccore_ids.ts` is an example; it's a one-shot migration but named for what it does, not how it was debugged).
