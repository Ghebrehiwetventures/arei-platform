# Source Troubleshooting

Version 1.0 | 2026-05-12

Companion to:
- `docs/operations/adding-a-source.md` — the linear playbook
- `docs/02-data-engine/source-investigation-loop.md` — the dry-run loop that uses these recipes to classify and fix a source before it goes live
- `docs/operations/engine-config-reference.md` — every `sources.yml` option

This file is symptom-first. Find the row that matches what you're seeing, follow the diagnosis steps, apply the fix.

Most fixes are `sources.yml` changes. A few require engine changes (`core/genericFetcher.ts`, `core/detail/plugins/genericDetail.ts`, `core/configLoader.ts`) — flagged where applicable.

---

## 1. Diagnostic script template

Every entry below assumes you can quickly run the actual extraction code against a saved page. Drop this template into `scripts/_diag.ts` (the leading underscore means "don't commit"):

```ts
import * as fs from "fs";
import { createGenericDetailPlugin } from "../core/detail/plugins/genericDetail";
import { loadSourcesConfig } from "../core/configLoader";
import { dedupeImageUrls } from "../core/genericFetcher";

const html = fs.readFileSync("/tmp/probe.html", "utf-8");
const cfg = loadSourcesConfig("{market}");          // e.g. "cv"
const src = cfg.data!.sources.find(s => s.id === "{source_id}")!;
const plugin = createGenericDetailPlugin(src.id, src.detail!, src.price_format);
const result = plugin.extract(html, "{a_detail_url}");
console.log({
  imageCount: result.imageUrls?.length,
  bedrooms: result.bedrooms,
  bathrooms: result.bathrooms,
  areaSqm: result.areaSqm,
  descriptionLength: result.description?.length,
  amenities: result.amenities,
});
result.imageUrls?.slice(0, 5).forEach((u, i) => console.log(`  img ${i+1}: ${u.slice(0,110)}`));
```

Run with:

```bash
NODE_OPTIONS="" npx ts-node --transpile-only scripts/_diag.ts
```

Delete the script when you're done.

---

## 2. Symptom → diagnosis recipes

### 2.1 "Listings show 3 images: 1 thumbnail + 2 site logos"

**Diagnosis:**
The configured `detail.selectors.images` is too loose (catches everything) OR too narrow (catches nothing, triggering the engine's fallback path which sweeps every `<img>` on the page).

```bash
curl -sLo /tmp/probe.html "{detail_url}" -A "Mozilla/5.0"
grep -oE '<img[^>]*class="[^"]*(header|footer|logo|brand)[^"]*"[^>]*>' /tmp/probe.html | head -5
```

If the page has logos with classes like `header__logo`, the engine's `isChromeElement` filter should catch them — but only when its parent code path runs. If your `selectors.images` matches zero elements, the engine falls back to `$("img")` over the whole page; chrome filtering catches most logos but not all.

**Fix:**
Tighten `selectors.images` to the actual gallery container:

```yaml
detail:
  selectors:
    images: "#gallery-id img, .gallery-class img"
```

Find the container by opening the detail page in a browser and inspecting one of the property photos. Look at its ancestor chain for an id or class that's specific to the gallery.

### 2.2 "Listings have lots of images, but some are from other listings"

**Diagnosis:**
Selector matches the right CDN domain but not the right page section. Real-estate sites commonly show "related properties" further down the detail page, with thumbnails from the same image CDN as the current listing's gallery.

```bash
grep -oE '<img[^>]*class="[^"]*item[^"]*"' /tmp/probe.html | head -5
```

Related-listing thumbnails often have classes containing `item`, `card`, `related`, `similar`, `more`.

**Fix:**
Narrow `selectors.images` to a gallery-specific container, not a CDN-domain match:

```yaml
# bad — catches related listings on same CDN
images: "img[src*='cdn.example.com']"

# good — only this listing's gallery
images: "#js-gallery__list img, .gallery__img"
```

### 2.3 "Title and description are in the wrong language"

**Diagnosis:**
The list URL is in the language you want, but the **detail page** the engine fetches is in another language.

```bash
# Check what the list cards link to
curl -sL "{list_url}" -A "Mozilla/5.0" | grep -oE 'href="[^"]*detail[^"]*"' | head -3

# Then check that detail URL's actual H1
curl -sL "{detail_url_from_above}" -A "Mozilla/5.0" | grep -oE '<h1[^>]*>[^<]+'
```

If the H1 is in a different language than the list cards, the list cards are linking to the wrong language variant. This is a site bug, common on bilingual CRM-backed sites.

**Fix:**
Find the correct detail URL prefix for the language you want (try `/en/property-detail/...`, `/property/en/...`, `/{lang}/...`). Then add:

```yaml
detail_url_rewrite:
  from: '/property-detail/'
  to:   '/en/property-detail/'
```

Re-run the pipeline. The upsert preserves existing `ai_descriptions` so cost stays near zero.

### 2.4 "Same listing appears as multiple rows with different ids"

**Diagnosis:**
The engine derived ids from `md5(title|price|url)`, and the same listing has slightly different titles or URLs across runs (e.g. you switched language variants between runs).

```sql
SELECT source_url_primary, count(*)
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}'
GROUP BY source_url_primary
HAVING count(*) > 1;
```

OR — more diagnostic:

```sql
SELECT id, title, source_url_primary
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}'
ORDER BY substring(source_url_primary FROM '/(\d+)(?:[/?#]|$)');
```

If two rows have URLs ending in the same numeric id but different `id` columns, they're duplicates.

**Fix:**
Two-step:

1. Add `id_url_pattern: '/(\d+)(?:[/?#]|$)'` to the source config (adjust regex for the URL shape).
2. Migrate existing rows to the new id scheme. Template: `scripts/migrate_ccore_ids.ts`. Always run with `DRY_RUN` first (i.e. without `APPLY=1`), inspect the plan, then re-run with `APPLY=1`.

After migration the next ingest hits the renamed rows via upsert instead of inserting duplicates.

### 2.5 "Sparse bathroom coverage (<50%) even though the site shows bathroom counts"

**Diagnosis:**
The bathroom count is in a structured spec block, not in the description prose. Body-text regex (`spec_patterns`) can't find it because the count isn't adjacent to the word "Bathroom".

```bash
curl -sLo /tmp/probe.html "{detail_url}" -A "Mozilla/5.0"
# Look for icon-driven spec rows
grep -oE '<i[^>]*class="[^"]*(fa-shower|fa-bath|fa-bed|fa-toilet)[^"]*"' /tmp/probe.html | head -5
# Then look at the span right after
awk '/class="[^"]*(detailsBar|specs|features-quick)/,/<\/(section|div)>/' /tmp/probe.html | head -30
```

If you see `<i class="fa-shower"></i><span>3</span>` (number after an icon with no text label), this is your case.

**Fix:**
Add icon-targeted selectors:

```yaml
detail:
  selectors:
    bedrooms:  "{container} i.fa-bed + span"
    bathrooms: "{container} i.fa-shower + span"
```

The engine runs `spec_patterns` first, then falls back to these selectors. So existing regex extraction for sites that DO have "3 Bathrooms" in body text isn't affected.

### 2.6 "Property images are being filtered out (we see 0 or 1 instead of many)"

**Diagnosis:**
Engine-level filtering is too aggressive. Probably the `SMALL_IMAGE_PATTERNS` regex in `core/detail/plugins/genericDetail.ts` is matching legitimate URLs.

Capture the raw URLs your selector matches:

```ts
// in scripts/_diag.ts
import * as cheerio from "cheerio";
const $ = cheerio.load(html);
$(src.detail!.selectors!.images!).each((_, el) => {
  const $el = $(el);
  if ($el.is("img")) console.log($el.attr("src"));
});
```

Then run each URL through the engine's filters mentally:
- Does it contain `logo`, `icon`, `sprite`, etc.? (URL filter rejects.)
- Does it contain `width=N` where N is 1–199, or `-NxN.` or `/NxN/`? (Size filter rejects.)
- Is its element's class or alt matching `header_`, `footer_`, `nav_`, `brand_`, `logo`, `icon`, `favicon`? (Chrome filter rejects.)

Most often the site serves photos with `width=200` to `width=400` thinking it's a default thumb. The engine treats widths up to 199 as small and lets the rest through — if your case is right on the boundary, the engine's bounds may need tightening, but verify with the diagnostic above first.

**Fix:**
If the filter is wrong (false positive on a legitimate URL), this is an engine change in `core/detail/plugins/genericDetail.ts`. Document the case in the PR description and adjust the regex bounds. Engine change → coordinate with other source maintainers if any.

### 2.7 "Lots of listings skipped: island unresolved"

**Diagnosis:**
The market's location resolver can't pin the listing to an island.

```bash
# Run the dry pipeline, look at the skipped log lines
DRY_RUN=1 MARKET_ID={market} SOURCE_ID={source_id} \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts 2>&1 | grep "island unresolved"
```

For each skipped id, inspect what location text the engine saw:

```sql
-- if the row was inserted on a previous run
SELECT id, title, source_url_primary FROM kv_curated.listings WHERE id='...';
```

Then re-fetch the list page and find the `selectors.location` text for that card. Common issues:
- Location selector matches the wrong element (catches the price or the title)
- Location text is "Ilha do Sal" but `markets/{market}/locations.yml` only has "Sal" mapped
- Location text is buried in the description rather than the card

**Fix:**
Either:
- Fix `selectors.location` to match the real location element on the list card, OR
- Add aliases to `markets/{market}/locations.yml` so the new location text resolves, OR
- Add a market-level hook in `markets/{market}/locationHooks.ts` for cases that need substring matching

The pipeline already does a fallback chain: card location → title → description → market hook. If none resolve an island, the row is skipped — this is intentional (we don't want geographically-unknown listings on the feed).

### 2.8 "Sometimes pagination stops early — fewer listings than the site shows"

**Diagnosis:**
`stop_condition: empty_listings` triggers when a page returns zero listings. If a page legitimately has zero (e.g. a server error returns an empty page), the crawl stops short.

```bash
# Manually fetch a few pages, look for legitimate vs. erroneous emptiness
for p in 1 2 3 4 5; do
  echo "--- page $p ---"
  curl -sL "{list_url}?page=$p" -A "Mozilla/5.0" | grep -c '{listing_class}'
done
```

If you see a real zero in the middle (something like 5, 5, 0, 5, 5), the source has a flaky page; consider `stop_condition: max_pages` and set `max_pages` to a known-good value.

### 2.9 "AI generation runs even though the rows already have descriptions"

**Diagnosis:**
The script's AI-gate (in `scripts/ingest_to_curated.ts`) skips generation only when `ai_descriptions IS NOT NULL` in the existing DB row. If your DB has `ai_descriptions = '{}'` or the existing rows are under a different `id`, the gate doesn't fire.

```sql
SELECT
  count(*) FILTER (WHERE ai_descriptions IS NOT NULL) AS with_ai,
  count(*) FILTER (WHERE ai_descriptions IS NULL)     AS without_ai,
  count(*) FILTER (WHERE ai_descriptions = '{}'::jsonb) AS empty_object
FROM kv_curated.listings
WHERE source_id_primary = '{source_id}';
```

If there are rows with `ai_descriptions = '{}'`, they will be re-generated on every run (the gate uses `IS NOT NULL`, not "is meaningful content"). Decide: should an empty JSONB count as "already has AI"? Currently the answer is "yes" — `{}` is not null. If you actually want these regenerated, set the column to NULL.

If new ids show up that shouldn't (i.e. they should match existing rows), see § 2.4.

### 2.10 "Real run failed mid-way; some rows updated, some didn't"

**Diagnosis:**
The pipeline writes row-by-row, not as one transaction. A network blip, API rate limit on AI, or DB connection drop can stop the run partway through.

```bash
# See where it stopped
tail -100 /tmp/ccore_ingest_run*.log
```

The pipeline is **idempotent** — re-running picks up where it left off:
- Already-written `needs_review` rows get refreshed (cheap, no AI).
- `published` rows are untouched by the status-gate.
- Rows not yet written get inserted.

**Fix:**
Just re-run. If the failure is recurring (rate limit, persistent DB error), investigate the root cause before re-running on a loop.

---

## 3. Engine-change checklist

If you've concluded the fix has to be in the engine, not the config:

1. The change should benefit at least three future sources, not just yours. If not, it belongs in the config layer or in a per-source override.
2. Add the new config option to:
   - `core/configLoader.ts` (the `SourceConfig` interface)
   - `core/genericFetcher.ts` (the `SourceFetchConfig` interface AND `buildFetchConfigFromYaml`)
3. Wire the option into the appropriate code path.
4. Add a description to `docs/operations/engine-config-reference.md`.
5. Add a worked example to that reference if the option is non-trivial.
6. Test against at least two sources (the one motivating the change + one unrelated source, to make sure you didn't break the default behaviour).

---

## 4. Don't-do list

- Don't write per-source `.ts` plugins. Configure or extend the engine.
- Don't bypass the `publish_status='needs_review'` status-gate. It exists to protect production from pipeline mistakes.
- Don't run the pipeline against a source whose `lifecycleOverride: DROP` — the script will refuse, but more importantly the source is dropped for a reason.
- Don't commit `scripts/_*.ts` (the leading-underscore convention for ephemeral diagnostic scripts) or `/tmp/*.html` probe files.
- Don't promote (`publish_status='published'`) without spot-checking.
- Don't `--no-verify` your way through pre-commit hooks. If the hook fails, fix the underlying issue.
