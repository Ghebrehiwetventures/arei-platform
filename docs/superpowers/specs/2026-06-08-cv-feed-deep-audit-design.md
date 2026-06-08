# CV Public-Feed Deep Audit — Design / Runbook

**Date:** 2026-06-08
**Status:** Ready to execute in a fresh session
**Type:** D (Investigation/audit) per `docs/operations/execution-protocol.md`
**Mode:** **READ-ONLY.** No DB writes, no promotions/demotions, no scraper/code
edits, no ingests. The deliverable is a findings report a human acts on later.

> This is a self-contained runbook. A fresh session has no prior context — every
> resource, command, and definition needed is embedded below. Background lives in
> `docs/02-data-engine/WIP-cv-source-investigation.md` (the source-by-source
> investigation that preceded this) but is not required reading to execute.

---

## 1. Objective

Intensely analyze the **published** CV listings on the public feed and answer,
per listing and in aggregate:

1. **City** — is the city correct and consistent with its island?
2. **Area** — is the square-meter number legitimate?
3. **Images** — are the images correct (real, reachable, belong to this listing)?
4. **Cross-source duplicates** — is the same property published by more than one source?
5. **Price** — is the price plausible?
6. **Title/description** — is the surfaced text clean and usable?

For every flag, classify the root cause **🔧 SCRAPER** (our extraction is wrong /
the value exists but we mishandled it) vs **🌐 SOURCE** (the source itself is
wrong/absent). This mirrors the verdict model in the WIP investigation.

## 2. Scope (the universe)

Only **`publish_status = 'published'`** rows, i.e. what is live on
`public.v1_feed_cv`. Snapshot at design time = **482 listings**; regenerate the
exact counts at run time (the feed drifts).

Per-source snapshot (2026-06-08, will drift):

| source_id | published |
|---|---:|
| cv_estatecv | 150 |
| cv_ccoreinvestments | 83 |
| cv_simplycapeverde | 61 |
| cv_homescasaverde | 60 |
| cv_remax | 39 |
| cv_terracaboverde | 37 |
| cv_capeverdeproperty24 | 36 |
| cv_oceanproperty24 | 11 |
| cv_cabohouseproperty | 5 |
| **TOTAL** | **482** |

Out of scope: `needs_review`, `removed`, dropped sources, and the stub sources
`cv_source_1`/`cv_source_2`.

## 3. Method — two-phase hybrid

**Phase 1 — heuristics over all 482 (cheap):** pure DB reads plus lightweight
HTTP HEAD/GET for image reachability. Each (listing, dimension) gets a status of
`ok` or `suspect` with a machine-readable reason code. No source page fetches
yet (except image URLs).

**Phase 2 — confirmation of flagged rows only (targeted):** for each flagged
listing, re-fetch its **original source** (page or API) and compare the live feed
value against the source. Assign the final verdict: **SCRAPER** / **SOURCE** /
**FALSE-POSITIVE** (heuristic over-flagged; value is actually fine). Use the
per-source fetch methods in §6. Keep Phase-2 volume bounded — if a dimension
flags an unusually large share (say >40% of a source), spot-check a sample and
say so rather than fetching every page.

This keeps the expensive source round-trips proportional to the number of real
suspects, while still giving authoritative verdicts where it matters.

## 4. Data access

```ts
// Reuse the project's pg client; it loads .env (DATABASE_URL) itself.
import { createPostgresClient } from "../core/postgresClient";
const c = createPostgresClient(); await c.connect();
```

- Feed view: `public.v1_feed_cv` (filter `source_id LIKE 'cv_%'`). Rich columns
  available include: `id, source_id, source_url, title, description,
  rendered_*_en, price, currency, island, city, bedrooms, bathrooms,
  property_size_sqm, land_area_sqm, image_urls, property_type, price_status,
  location_confidence, has_valid_images, cover_image_url, cover_image_hash,
  duplicate_risk, identity_fingerprint, cross_source_match_key,
  canonical_listing_id, dedup_key, ai_descriptions`.
- Curated table (for joins / provenance): `kv_curated.listings`, keyed by
  `id`, `source_id_primary`, `source_url_primary`, `publish_status`.
- Query directly with `DATABASE_URL` / `pg`. Do **not** use the Supabase
  JS/REST client for verification (precedent throughout the investigation).
- Write a throwaway `scripts/_*.ts` helper, run with
  `npx ts-node --transpile-only`, and **delete it after** (gitignored `reports/`
  is fine for outputs).

## 5. Dimension checks (Phase 1 heuristics)

Reuse existing engine logic wherever possible rather than re-implementing:
`core/pipeline/locationResolver.ts`, `markets/cv/locationHooks.ts`,
`core/pipeline/propertyType.ts`, and `parseAreaTextSqm` /image filters in
`core/detail/plugins/genericDetail.ts`.

### 5.1 City
- `island` ∈ the 9 inhabited CV islands: Santiago, Sal, Boa Vista, São Vicente,
  Santo Antão, Fogo, Maio, Brava, São Nicolau.
- `city` non-empty, not equal to the island name, not "Cape Verde"/country, not
  a bare code/street, not a generic placeholder.
- **city↔island consistency** against a CV gazetteer (build/confirm one; main
  municipalities): Sal→Santa Maria/Espargos; Boa Vista→Sal Rei; Santiago→Praia,
  Assomada, Tarrafal, Cidade Velha; São Vicente→Mindelo; Santo Antão→Porto Novo,
  Ribeira Grande, Paul; Fogo→São Filipe, Mosteiros; Maio→Porto Inglês (Vila do
  Maio); Brava→Nova Sintra; São Nicolau→Ribeira Brava, Tarrafal de São Nicolau.
  Flag a city that does not belong to its stated island.
- Cross-check `location_confidence` where present.
- Reason codes: `city_empty`, `city_eq_island`, `city_generic`,
  `city_island_mismatch`, `island_invalid`.

### 5.2 Area
- Plausibility: flag `property_size_sqm < 10` or implausibly large (e.g.
  apartment/house `> 1000`; treat `land_area_sqm` separately, larger bound).
- **sqm-per-bedroom** ratio outliers (e.g. `< 8` or `> 150` sqm/bedroom).
- Land/commercial rows carrying a residential `property_size_sqm`, or land rows
  missing `land_area_sqm`.
- Suspected sqft-stored-as-sqm (value ~10.76× too large vs beds).
- Note: the engine now floors area at 5 sqm (`MIN_PLAUSIBLE_AREA_SQM`) and
  rejects unit-code digits (`En-bv-01`); flag anything that still looks wrong.
- Reason codes: `area_too_small`, `area_too_large`, `area_per_bed_outlier`,
  `area_land_field_misuse`, `area_unit_suspect`.

### 5.3 Images
- **Host allowlist** per source (e.g. `cdn.gryphtech.com` for remax; the source
  domain or its CDN for others). Flag off-host URLs.
- **Reachability** (sample if volume is high): HTTP 200 + `Content-Type: image/*`
  + non-empty body. Flag 4xx/5xx/empty/non-image.
- **Within-listing duplicate** URLs.
- **Cross-listing cover reuse**: same `cover_image_hash` (or cover URL) on
  listings that are otherwise different — the cross-association bug class.
- Junk/placeholder/logo/social/tracking patterns.
- Count: flag `< 1` (should never happen on the feed) and quality-flag `< 3`.
- Cross-check `has_valid_images` / `has_valid_image`.
- Reason codes: `img_off_host`, `img_unreachable`, `img_dup_in_listing`,
  `img_cover_shared_across_listings`, `img_junk`, `img_count_low`.

### 5.4 Cross-source duplicates
- Cluster listings likely representing the same physical property across
  different `source_id`s. Signals (combine, don't rely on one):
  matching `cover_image_hash`; matching `identity_fingerprint` /
  `cross_source_match_key` (already computed in the feed); near-identical
  normalized title; same `(price, bedrooms, property_size_sqm, city)`
  fingerprint.
- Report clusters with ≥2 sources. Inspect `duplicate_risk` /
  `canonical_listing_id` to see what the engine already detected vs missed.
- Reason codes: `dup_cover_hash`, `dup_fingerprint`, `dup_title_price_area`.

### 5.5 Price
- Range: flag `price < 5000` or `price > 5,000,000` EUR-equivalent (tune to CV).
- **price/sqm** outliers (CV roughly €1k–5k/sqm; flag `< €200/sqm` or
  `> €15k/sqm`). **price/bedroom** outliers as secondary.
- Currency/magnitude: `currency` consistent with magnitude. NhaKaza is **CVE**
  (≈110 CVE/EUR) — a CVE value read as EUR (or vice-versa) is a ~100× error.
- `price = null` is valid ("price on request"); do not flag as missing, but note
  if such rows are unexpectedly on the feed.
- Reason codes: `price_out_of_range`, `price_per_sqm_outlier`,
  `price_currency_suspect`.

### 5.6 Title/description
- Title: flag truncation (mid-word/trailing `…`), placeholder/boilerplate, empty
  or `< 5` chars, HTML leakage, wrong language where EN is expected (some sources
  are PT — note, don't over-flag), duplicate titles across listings.
- Description / `rendered_description_html_en` / `ai_descriptions`: missing,
  truncated, raw-HTML leakage, or obvious boilerplate.
- Reason codes: `title_truncated`, `title_placeholder`, `title_too_short`,
  `title_html`, `title_dup`, `desc_missing`, `desc_quality`.

## 6. Phase-2 source re-fetch methods

Per-source fetch behavior (from `markets/cv/sources.yml` and the WIP tracker).
Use these to confirm flagged values against the live source.

| source | fetch | notes for verification |
|---|---|---|
| cv_remax | json_api (POST) | `https://www.remax.cv/search/listing-search/docs/search`, body `{search:"*", filter:"content/ListingCountryCode eq 'CV' and content/IsFindable eq true and content/TransactionTypeUID eq 261", count:true, skip, top}`; listing pages are JS shells — use the API per `MLSID` (id minus `rmx_`). |
| cv_estatecv | http detail | server-rendered; JSON-LD + spec tables; localized (Czech) labels possible. |
| cv_simplycapeverde | http | Houzez/WordPress; JSON-LD present; short `-A Mozilla/5.0` → 406, use full browser headers or default curl. |
| cv_homescasaverde | http | Houzez; ShortPixel CDN images; overview area as previous-sibling value. |
| cv_capeverdeproperty24 | http | OSProperty; `#propertydetails .corefields` `.fieldlabel`/`.fieldvalue`; "Call for details" = POA. |
| cv_ccoreinvestments | http | Casafari/Proppy detail bar (`.detailsBar__list` icons). Host occasionally unreachable — retry. |
| cv_oceanproperty24 | http | WordPress; dedicated `.property_default_*` nodes; studios = `bedrooms 0`. |
| cv_terracaboverde | headless (list) / http (detail) | Elementor; `Sales area:` is truth, `Area:` is a unit code; images scoped to `#prop-gallery`. |
| cv_cabohouseproperty | headless | MyHome; **MalCare 403 firewall** may block (issue #361) — may be unverifiable; note as blocked. |

Use browser-like headers. Treat HTTP `000`/403/empty as "could not verify" — do
not infer SOURCE from an unreachable page.

## 7. Output

### 7.1 Primary report (human-facing)
`docs/02-data-engine/cv-feed-audit-<YYYY-MM-DD>.md`, structured as:

1. **Run provenance** — date, feed total + per-source counts at run time, method.
2. **Scorecard** — one row per dimension: `checked / flagged / SCRAPER / SOURCE /
   false-positive`, plus a one-line health verdict.
3. **Per-dimension sections** — a table of flagged listings:
   `id | source | feed value | reason code | Phase-2 verdict | source value | note`.
4. **Cross-source duplicate clusters** — grouped listing.
5. **Prioritized recommendations** — concrete follow-ups (e.g. "fix X scraper",
   "demote N rows", "gazetteer gap"), ranked by severity × count. **Recommend
   only; do not execute.**
6. **Limitations** — anything unverifiable (e.g. cabohouse blocked), sampling
   used, truth-class labels per the execution protocol.

### 7.2 Machine-readable
`reports/feed-audit/cv_feed_audit_<YYYY-MM-DD>.json` (under gitignored
`reports/`): array of every flagged `(id, source, dimension, reason, feed_value,
verdict, source_value)` for follow-up tooling/remediation.

## 8. Guardrails (read-only)

- No `UPDATE`/`INSERT`/`DELETE` on `kv_curated.listings` or the feed. No
  `publish_status` changes. No ingests. No edits to `core/`, `markets/`, configs.
- Verification queries and source fetches only.
- Delete any throwaway `scripts/_*.ts` helpers when done.
- Label findings by truth class (verified-in-data / verified-live) per
  `docs/operations/execution-protocol.md` §2.
- Escalate (stop and report), don't act, if the audit suggests fixes — the
  remediation decision is the founder's.

## 9. Definition of done

- Every published listing passed through all six Phase-1 checks.
- Every Phase-1 flag has a Phase-2 verdict (or an explicit "unverifiable"
  reason).
- Primary report + JSON written; no production state changed; helpers cleaned up.
- Report ends with prioritized, evidence-backed recommendations for a human.
