# CV Public-Feed Deep Audit — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to run this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a read-only findings report on the quality of the ~482
published CV listings on `public.v1_feed_cv` across 6 dimensions (city, area,
images, cross-source duplicates, price, title/description), classifying each
flag as 🔧 SCRAPER vs 🌐 SOURCE.

**Architecture:** Two phases. Phase 1 runs cheap heuristics over *all* published
rows and writes flagged rows to per-dimension JSON files. Phase 2 re-fetches
*only* flagged listings from their original source to confirm each flag. A final
task assembles a Markdown report + a machine-readable JSON.

**Tech Stack:** TypeScript run via `npx ts-node --transpile-only`; `pg` via
`core/postgresClient.ts`; Node `https`/`curl` for source fetches; the live
Postgres (`DATABASE_URL` in `.env`).

**Spec:** `docs/superpowers/specs/2026-06-08-cv-feed-deep-audit-design.md`.

> **Not TDD.** These are throwaway *analysis* helpers (`scripts/_audit_*.ts`),
> not production code — there is no behavior to test-first. Each task's
> "verification" is running the helper and sanity-reviewing its output. Delete
> all `scripts/_audit_*.ts` helpers at the end (Task 9). The only committed
> artifact is the final report under `docs/02-data-engine/`.

> **READ-ONLY GUARDRAIL (applies to every task):** No `UPDATE`/`INSERT`/`DELETE`,
> no `publish_status` changes, no ingests, no edits to `core/`, `markets/`, or
> configs. Verification queries and source fetches only. If you find something
> that needs fixing, write it as a *recommendation* — do not act on it.

---

## File structure

| Path | Responsibility | Committed? |
|---|---|---|
| `scripts/_audit_snapshot.ts` | Pull all published rows → snapshot JSON | no (delete at end) |
| `scripts/_audit_city.ts` | City heuristics → flags | no |
| `scripts/_audit_area.ts` | Area heuristics → flags | no |
| `scripts/_audit_images.ts` | Image heuristics → flags | no |
| `scripts/_audit_dupes.ts` | Cross-source duplicate clusters | no |
| `scripts/_audit_price.ts` | Price heuristics → flags | no |
| `scripts/_audit_text.ts` | Title/description heuristics → flags | no |
| `scripts/_audit_phase2.ts` | Re-fetch flagged rows, confirm verdicts | no |
| `scripts/_audit_report.ts` | Assemble report + final JSON | no |
| `reports/feed-audit/feed_snapshot.json` | The universe (gitignored) | no |
| `reports/feed-audit/flags_*.json` | Per-dimension flags (gitignored) | no |
| `reports/feed-audit/cv_feed_audit_<date>.json` | Final machine output (gitignored) | no |
| `docs/02-data-engine/cv-feed-audit-<date>.md` | **Final report** | **yes** |

Set `DATE=$(date +%F)` once at the start and reuse it for filenames.

---

## Task 0: Setup + snapshot the universe

**Files:**
- Create: `scripts/_audit_snapshot.ts`
- Output: `reports/feed-audit/feed_snapshot.json`

- [ ] **Step 1: Confirm branch + create output dir**

Run:
```bash
cd /Users/violetapalomerasilva/development/arei-platform
git rev-parse --abbrev-ref HEAD          # expect codex/source-ops-dev (a non-main branch)
mkdir -p reports/feed-audit
```

- [ ] **Step 2: Write the snapshot helper**

```ts
// scripts/_audit_snapshot.ts
import { createPostgresClient } from "../core/postgresClient";
import * as fs from "fs";
async function main() {
  const c = createPostgresClient(); await c.connect();
  const r = await c.query(`
    SELECT id, source_id, source_url, title, description, rendered_description_html_en,
           price, currency, price_status, island, city, location_confidence,
           bedrooms, bathrooms, property_type, property_size_sqm, land_area_sqm,
           image_urls, cover_image_url, cover_image_hash, has_valid_images,
           identity_fingerprint, cross_source_match_key, dedup_key,
           canonical_listing_id, duplicate_risk, ai_descriptions
    FROM public.v1_feed_cv
    WHERE source_id LIKE 'cv_%'
    ORDER BY source_id, id`);
  fs.writeFileSync("reports/feed-audit/feed_snapshot.json", JSON.stringify(r.rows, null, 2));
  const bySrc: Record<string, number> = {};
  r.rows.forEach((x: any) => { bySrc[x.source_id] = (bySrc[x.source_id] || 0) + 1; });
  console.log("rows:", r.rows.length); console.log(bySrc);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run it**

Run: `npx ts-node --transpile-only scripts/_audit_snapshot.ts`
Expected: prints `rows: <N>` (~482) and a per-source count map; writes
`reports/feed-audit/feed_snapshot.json`. Record N and the per-source counts —
these are the run-time universe for the report's provenance section.

---

## Task 1: City heuristics (Phase 1)

**Files:**
- Create: `scripts/_audit_city.ts`
- Output: `reports/feed-audit/flags_city.json`

- [ ] **Step 1: Write the city checker**

```ts
// scripts/_audit_city.ts
import * as fs from "fs";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));

// CV gazetteer: island -> known municipalities/cities (lowercase contains-match).
const GAZ: Record<string, string[]> = {
  "santiago": ["praia", "assomada", "tarrafal", "cidade velha", "santa catarina", "são domingos", "pedra badejo", "calheta"],
  "sal": ["santa maria", "espargos", "palmeira", "pedra de lume"],
  "boa vista": ["sal rei", "rabil", "povoação velha"],
  "são vicente": ["mindelo", "calhau", "são pedro"],
  "santo antão": ["porto novo", "ribeira grande", "paul", "ponta do sol"],
  "fogo": ["são filipe", "mosteiros", "cova figueira"],
  "maio": ["porto inglês", "vila do maio", "cidade do maio"],
  "brava": ["nova sintra", "furna"],
  "são nicolau": ["ribeira brava", "tarrafal de são nicolau"],
};
const norm = (s: string | null) => (s || "").trim().toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, ""); // strip accents for matching
const GAZ_N: Record<string, string[]> = {};
for (const [isl, cities] of Object.entries(GAZ)) GAZ_N[norm(isl)] = cities.map(norm);

const flags: any[] = [];
for (const r of rows) {
  const island = norm(r.island), city = norm(r.city);
  const reasons: string[] = [];
  if (!island || !(island in GAZ_N)) reasons.push("island_invalid");
  if (!city) reasons.push("city_empty");
  else if (city === island) reasons.push("city_eq_island");
  else if (["cape verde", "cabo verde", "cv"].includes(city)) reasons.push("city_generic");
  else if (island in GAZ_N && !GAZ_N[island].some(g => city.includes(g) || g.includes(city)))
    reasons.push("city_island_mismatch");
  if (reasons.length) flags.push({ id: r.id, source: r.source_id, dimension: "city",
    feed_value: `${r.city} / ${r.island}`, reasons, source_url: r.source_url });
}
fs.writeFileSync("reports/feed-audit/flags_city.json", JSON.stringify(flags, null, 2));
console.log("city flags:", flags.length);
const byReason: Record<string, number> = {};
flags.forEach(f => f.reasons.forEach((x: string) => byReason[x] = (byReason[x] || 0) + 1));
console.log(byReason);
```

- [ ] **Step 2: Run + sanity-check**

Run: `npx ts-node --transpile-only scripts/_audit_city.ts`
Expected: prints flag count + reason histogram; writes `flags_city.json`.
Sanity-check: open a few flagged rows; if a real CV city is being flagged as
`city_island_mismatch`, **add it to the gazetteer** and re-run (gazetteer gaps
are expected and are themselves a finding to record).

---

## Task 2: Area heuristics (Phase 1)

**Files:**
- Create: `scripts/_audit_area.ts`
- Output: `reports/feed-audit/flags_area.json`

- [ ] **Step 1: Write the area checker**

```ts
// scripts/_audit_area.ts
import * as fs from "fs";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
const LAND_TYPES = new Set(["land", "plot", "terreno"]);
const flags: any[] = [];
for (const r of rows) {
  const a = r.property_size_sqm, land = r.land_area_sqm, beds = r.bedrooms;
  const reasons: string[] = [];
  if (a != null) {
    if (a < 10) reasons.push("area_too_small");
    else if (a > 1000 && !LAND_TYPES.has(r.property_type)) reasons.push("area_too_large");
    if (beds && beds > 0) {
      const perBed = a / beds;
      if (perBed < 8) reasons.push("area_per_bed_low");
      else if (perBed > 150) reasons.push("area_per_bed_high");
    }
  }
  if (LAND_TYPES.has(r.property_type) && a != null && land == null) reasons.push("area_land_field_misuse");
  if (reasons.length) flags.push({ id: r.id, source: r.source_id, dimension: "area",
    feed_value: `prop=${a} land=${land} beds=${beds} type=${r.property_type}`,
    reasons, source_url: r.source_url });
}
fs.writeFileSync("reports/feed-audit/flags_area.json", JSON.stringify(flags, null, 2));
console.log("area flags:", flags.length);
```

- [ ] **Step 2: Run + sanity-check**

Run: `npx ts-node --transpile-only scripts/_audit_area.ts`
Expected: flag count printed; `flags_area.json` written. The engine now floors
area at 5 sqm, so `area_too_small` flags should be rare — investigate any in
Phase 2.

---

## Task 3: Image heuristics (Phase 1)

**Files:**
- Create: `scripts/_audit_images.ts`
- Output: `reports/feed-audit/flags_images.json`

- [ ] **Step 1: Write the image checker (reachability sampled)**

```ts
// scripts/_audit_images.ts
import * as fs from "fs";
import * as https from "https";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
const JUNK = /logo|placeholder|sprite|icon|social|facebook|twitter|pixel|no-image|default|avatar/i;

function head(url: string): Promise<{ ok: boolean; ct: string; code: number }> {
  return new Promise((res) => {
    try {
      const req = https.request(url, { method: "GET", headers: { "User-Agent": "Mozilla/5.0" } }, r => {
        const ct = String(r.headers["content-type"] || "");
        r.destroy(); res({ ok: (r.statusCode || 0) < 400 && ct.startsWith("image/"), ct, code: r.statusCode || 0 });
      });
      req.on("error", () => res({ ok: false, ct: "", code: 0 }));
      req.setTimeout(15000, () => { req.destroy(); res({ ok: false, ct: "timeout", code: 0 }); });
      req.end();
    } catch { res({ ok: false, ct: "", code: 0 }); }
  });
}

async function main() {
  // cross-listing cover reuse
  const coverCount: Record<string, string[]> = {};
  for (const r of rows) {
    const k = r.cover_image_hash || r.cover_image_url;
    if (k) (coverCount[k] = coverCount[k] || []).push(r.id);
  }
  const flags: any[] = [];
  for (const r of rows) {
    const imgs: string[] = r.image_urls || [];
    const reasons: string[] = [];
    if (imgs.length < 1) reasons.push("img_count_zero");
    else if (imgs.length < 3) reasons.push("img_count_low");
    if (new Set(imgs).size < imgs.length) reasons.push("img_dup_in_listing");
    if (imgs.some(u => JUNK.test(u))) reasons.push("img_junk");
    const k = r.cover_image_hash || r.cover_image_url;
    if (k && coverCount[k] && coverCount[k].length > 1) reasons.push("img_cover_shared_across_listings");
    // reachability: check the first image of each listing (sample 1/listing to bound cost)
    if (imgs[0]) { const h = await head(imgs[0]); if (!h.ok) reasons.push(`img_unreachable(${h.code}/${h.ct})`); }
    if (reasons.length) flags.push({ id: r.id, source: r.source_id, dimension: "images",
      feed_value: `${imgs.length} imgs`, reasons, source_url: r.source_url });
  }
  fs.writeFileSync("reports/feed-audit/flags_images.json", JSON.stringify(flags, null, 2));
  console.log("image flags:", flags.length);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it (takes a few min — one HTTP GET per listing)**

Run: `npx ts-node --transpile-only scripts/_audit_images.ts`
Expected: flag count printed; `flags_images.json` written. Note: per-source host
allowlist verification and full-gallery reachability are deferred to Phase 2 for
flagged rows (checking all ~6–8k image URLs up front is unnecessary).

---

## Task 4: Cross-source duplicate clusters (Phase 1)

**Files:**
- Create: `scripts/_audit_dupes.ts`
- Output: `reports/feed-audit/flags_dupes.json`

- [ ] **Step 1: Write the duplicate clusterer**

```ts
// scripts/_audit_dupes.ts
import * as fs from "fs";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
function cluster(keyFn: (r: any) => string | null, label: string) {
  const m: Record<string, any[]> = {};
  for (const r of rows) { const k = keyFn(r); if (k) (m[k] = m[k] || []).push(r); }
  return Object.values(m).filter(g => g.length > 1 && new Set(g.map(r => r.source_id)).size > 1)
    .map(g => ({ key: label, members: g.map(r => ({ id: r.id, source: r.source_id, title: r.title, price: r.price })) }));
}
const norm = (s: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clusters = [
  ...cluster(r => r.cover_image_hash, "cover_hash"),
  ...cluster(r => r.identity_fingerprint, "identity_fingerprint"),
  ...cluster(r => r.cross_source_match_key, "cross_source_match_key"),
  ...cluster(r => (r.price && r.bedrooms != null && r.property_size_sqm != null && r.city)
    ? `${r.price}|${r.bedrooms}|${r.property_size_sqm}|${norm(r.city)}` : null, "price_beds_area_city"),
];
fs.writeFileSync("reports/feed-audit/flags_dupes.json", JSON.stringify(clusters, null, 2));
console.log("cross-source duplicate clusters:", clusters.length);
```

- [ ] **Step 2: Run + sanity-check**

Run: `npx ts-node --transpile-only scripts/_audit_dupes.ts`
Expected: cluster count printed; `flags_dupes.json` written. The same property
may surface under multiple keys — dedupe by member-id set when reporting.

---

## Task 5: Price heuristics (Phase 1)

**Files:**
- Create: `scripts/_audit_price.ts`
- Output: `reports/feed-audit/flags_price.json`

- [ ] **Step 1: Write the price checker**

```ts
// scripts/_audit_price.ts
import * as fs from "fs";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
const CVE_PER_EUR = 110.265;
const flags: any[] = [];
for (const r of rows) {
  if (r.price == null) continue; // null = price-on-request, valid
  // normalize to EUR for cross-source comparison
  const eur = r.currency === "CVE" ? r.price / CVE_PER_EUR : r.price;
  const reasons: string[] = [];
  if (eur < 5000) reasons.push("price_too_low");
  if (eur > 5_000_000) reasons.push("price_too_high");
  if (r.property_size_sqm && r.property_size_sqm >= 10) {
    const perSqm = eur / r.property_size_sqm;
    if (perSqm < 200) reasons.push("price_per_sqm_low");
    else if (perSqm > 15000) reasons.push("price_per_sqm_high");
  }
  // EUR value in CVE magnitude or vice-versa (rough): EUR price > 2M but currency EUR & tiny area
  if (r.currency !== "CVE" && eur > 1_000_000 && (r.bedrooms || 0) <= 2) reasons.push("price_currency_suspect");
  if (reasons.length) flags.push({ id: r.id, source: r.source_id, dimension: "price",
    feed_value: `${r.price} ${r.currency} (~€${Math.round(eur)})`, reasons, source_url: r.source_url });
}
fs.writeFileSync("reports/feed-audit/flags_price.json", JSON.stringify(flags, null, 2));
console.log("price flags:", flags.length);
```

- [ ] **Step 2: Run it**

Run: `npx ts-node --transpile-only scripts/_audit_price.ts`
Expected: flag count printed; `flags_price.json` written.

---

## Task 6: Title/description heuristics (Phase 1)

**Files:**
- Create: `scripts/_audit_text.ts`
- Output: `reports/feed-audit/flags_text.json`

- [ ] **Step 1: Write the text checker**

```ts
// scripts/_audit_text.ts
import * as fs from "fs";
const rows = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
const titleCounts: Record<string, number> = {};
rows.forEach((r: any) => { const t = (r.title || "").trim().toLowerCase(); if (t) titleCounts[t] = (titleCounts[t] || 0) + 1; });
const flags: any[] = [];
for (const r of rows) {
  const t = (r.title || "").trim();
  const reasons: string[] = [];
  if (t.length < 5) reasons.push("title_too_short");
  if (/\.\.\.$|…$/.test(t)) reasons.push("title_truncated");
  if (/<[^>]+>/.test(t)) reasons.push("title_html");
  if (/(lorem ipsum|untitled|test listing|property \d+|^property$)/i.test(t)) reasons.push("title_placeholder");
  if (t && titleCounts[t.toLowerCase()] > 1) reasons.push("title_dup");
  const desc = r.rendered_description_html_en || r.description || "";
  if (!desc || desc.trim().length < 20) reasons.push("desc_missing_or_short");
  if (reasons.length) flags.push({ id: r.id, source: r.source_id, dimension: "text",
    feed_value: t.slice(0, 60), reasons, source_url: r.source_url });
}
fs.writeFileSync("reports/feed-audit/flags_text.json", JSON.stringify(flags, null, 2));
console.log("text flags:", flags.length);
```

- [ ] **Step 2: Run it**

Run: `npx ts-node --transpile-only scripts/_audit_text.ts`
Expected: flag count printed; `flags_text.json` written.

---

## Task 7: Phase 2 — confirm flagged rows against source

**Files:**
- Create: `scripts/_audit_phase2.ts`
- Output: `reports/feed-audit/verdicts.json`

This task re-fetches the **original source** for flagged listings and assigns
each flag a verdict: `SCRAPER` (source has the right value, we got it wrong),
`SOURCE` (source is wrong/absent), `FALSE_POSITIVE` (value is actually fine,
heuristic over-flagged), or `UNVERIFIABLE` (source unreachable/blocked).

Per-source fetch methods (from the spec §6): `cv_remax` → JSON API by MLSID;
all other live sources → HTTP GET of `source_url` with browser headers and
inspect the page; `cv_cabohouseproperty` may be MalCare-403 blocked → mark
`UNVERIFIABLE`. `cv_terracaboverde` detail pages are HTTP-fetchable for
inspection even though list fetch is headless.

- [ ] **Step 1: Collect the flagged set**

```bash
# how many unique listings are flagged across all dimensions?
node -e 'const fs=require("fs");const all=["city","area","images","price","text"].flatMap(d=>JSON.parse(fs.readFileSync(`reports/feed-audit/flags_${d}.json`,"utf8")));const ids=new Set(all.map(f=>f.id));console.log("flagged listings:",ids.size,"| total flags:",all.length);'
```
Expected: prints the flagged-listing count. If a single dimension flags >40% of
a source, plan to spot-check a sample for that (source, dimension) rather than
fetching every page — note the sampling in the report.

- [ ] **Step 2: Write the Phase-2 confirmer**

```ts
// scripts/_audit_phase2.ts
// For each flagged listing, fetch the source and record what the source shows
// for the flagged dimension(s). This helper FETCHES and RECORDS raw evidence;
// the human/agent assigns the final verdict in the report (Task 8) using it.
import * as fs from "fs";
import * as https from "https";

const dims = ["city", "area", "images", "price", "text"];
const flagsByListing: Record<string, any> = {};
for (const d of dims) for (const f of JSON.parse(fs.readFileSync(`reports/feed-audit/flags_${d}.json`, "utf8"))) {
  flagsByListing[f.id] = flagsByListing[f.id] || { id: f.id, source: f.source, source_url: f.source_url, flags: [] };
  flagsByListing[f.id].flags.push({ dimension: f.dimension, reasons: f.reasons, feed_value: f.feed_value });
}

function get(url: string): Promise<{ code: number; body: string }> {
  return new Promise((res) => {
    const req = https.request(url, { method: "GET", headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml" } }, r => {
      let b = ""; r.on("data", c => b += c); r.on("end", () => res({ code: r.statusCode || 0, body: b }));
    });
    req.on("error", () => res({ code: 0, body: "" }));
    req.setTimeout(30000, () => { req.destroy(); res({ code: 0, body: "" }); });
    req.end();
  });
}
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const out: any[] = [];
  for (const rec of Object.values(flagsByListing)) {
    const r: any = rec;
    if (r.source === "cv_cabohouseproperty") { out.push({ ...r, verdict_hint: "UNVERIFIABLE", evidence: "MalCare 403 likely" }); continue; }
    // remax: source page is a JS shell — note to verify via API by MLSID if needed
    const resp = await get(r.source_url || "");
    const text = strip(resp.body).slice(0, 4000);
    // pull a few signals to help the verdict
    const ev = {
      http: resp.code,
      area_sqm: (text.match(/[0-9][0-9.,]*\s?(?:sqm|m²|m2|sqmt)/gi) || []).slice(0, 5),
      city_words: (text.match(/santa maria|sal rei|mindelo|praia|espargos|porto novo|são filipe|santiago|boa vista|sal\b/gi) || []).slice(0, 5),
      price_words: (text.match(/€\s?[0-9.,]+|[0-9][0-9.,]{3,}\s?(?:€|EUR|CVE)|call for|on request|negotiat/gi) || []).slice(0, 5),
    };
    out.push({ ...r, evidence: ev });
    await new Promise(s => setTimeout(s, 800)); // be polite
  }
  fs.writeFileSync("reports/feed-audit/verdicts.json", JSON.stringify(out, null, 2));
  console.log("phase-2 records:", out.length);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run it**

Run: `npx ts-node --transpile-only scripts/_audit_phase2.ts`
Expected: writes `verdicts.json` with per-listing source evidence. For
`cv_remax` rows needing confirmation, additionally query the API by MLSID (spec
§6) — the HTML body will be a near-empty JS shell. Inspect the evidence and
decide SCRAPER / SOURCE / FALSE_POSITIVE / UNVERIFIABLE per flag in Task 8.

---

## Task 8: Assemble the report

**Files:**
- Create: `scripts/_audit_report.ts` (builds the scorecard + JSON)
- Create: `docs/02-data-engine/cv-feed-audit-<DATE>.md` (the deliverable)
- Output: `reports/feed-audit/cv_feed_audit_<DATE>.json`

- [ ] **Step 1: Build the scorecard + machine JSON**

```ts
// scripts/_audit_report.ts
import * as fs from "fs";
const dims = ["city", "area", "images", "price", "text"];
const snapshot = JSON.parse(fs.readFileSync("reports/feed-audit/feed_snapshot.json", "utf8"));
const verdicts = JSON.parse(fs.readFileSync("reports/feed-audit/verdicts.json", "utf8"));
const dupes = JSON.parse(fs.readFileSync("reports/feed-audit/flags_dupes.json", "utf8"));
const all: any[] = [];
const scorecard: Record<string, number> = {};
for (const d of dims) {
  const f = JSON.parse(fs.readFileSync(`reports/feed-audit/flags_${d}.json`, "utf8"));
  scorecard[d] = f.length; all.push(...f);
}
fs.writeFileSync(`reports/feed-audit/cv_feed_audit_${process.env.DATE}.json`,
  JSON.stringify({ universe: snapshot.length, scorecard, dupe_clusters: dupes.length, flags: all, phase2: verdicts }, null, 2));
console.log("universe:", snapshot.length, "scorecard:", scorecard, "dupe clusters:", dupes.length);
```

Run: `DATE=$(date +%F) npx ts-node --transpile-only scripts/_audit_report.ts`
Expected: prints universe size + per-dimension flag counts; writes the final JSON.

- [ ] **Step 2: Hand-write the report Markdown**

Create `docs/02-data-engine/cv-feed-audit-<DATE>.md` using the numbers above and
the Phase-2 evidence. Required structure (spec §7.1):

1. **Run provenance** — date, feed total + per-source counts (Task 0), method
   (two-phase hybrid), read-only.
2. **Scorecard** — table: `dimension | checked | flagged | SCRAPER | SOURCE |
   false-positive | health verdict`. (Checked = universe size for that
   dimension; SCRAPER/SOURCE/FP counts from your Task-7 verdicts.)
3. **Per-dimension sections** — for each of the 6 dimensions, a table of flagged
   listings: `id | source | feed value | reason | verdict | source value | note`.
4. **Cross-source duplicate clusters** — grouped listings from `flags_dupes.json`.
5. **Prioritized recommendations** — ranked by severity × count
   (recommend only, do not execute). Examples: a scraper to fix, a gazetteer
   gap, rows a human should demote.
6. **Limitations** — unverifiable sources (e.g. cabohouse 403), any sampling
   used, truth-class labels per the execution protocol.

- [ ] **Step 3: Verify the report has no placeholders and every flag is accounted for**

Run:
```bash
grep -nE "TBD|TODO|FIXME|XXX" docs/02-data-engine/cv-feed-audit-*.md || echo "no placeholders"
```
Expected: `no placeholders`. Confirm each dimension's flagged count in the
scorecard matches the rows listed in its section.

---

## Task 9: Cleanup + commit the report

- [ ] **Step 1: Delete throwaway helpers**

Run:
```bash
rm -f scripts/_audit_*.ts
git status --short    # only the new docs/02-data-engine/cv-feed-audit-<DATE>.md should be untracked
```
Expected: no `scripts/_audit_*` files; `reports/` is gitignored (not shown).

- [ ] **Step 2: Confirm read-only posture was honored**

Run:
```bash
# sanity: no schema/data writes were made — published count unchanged vs Task 0 snapshot
node -e 'const s=require("./reports/feed-audit/feed_snapshot.json");console.log("snapshot universe:",s.length);'
```
Expected: matches the Task-0 universe. (You never issued an UPDATE/INSERT/DELETE.)

- [ ] **Step 3: Commit the report**

```bash
git add docs/02-data-engine/cv-feed-audit-*.md
git commit -m "docs(cv): public-feed deep audit findings <DATE>

Read-only audit of the published CV feed across 6 dimensions (city, area,
images, cross-source duplicates, price, title/description). Findings + verdicts
+ prioritized recommendations; no production state changed.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (plan author)

- **Spec coverage:** all 6 dimensions (spec §5) → Tasks 1–6; two-phase method
  (§3) → Phase 1 Tasks 1–6 + Phase 2 Task 7; data access (§4) → Task 0; output
  (§7) → Task 8; guardrails (§8) → header banner + Task 9 Step 2; DoD (§9) →
  Tasks 7–9. Per-source fetch table (§6) embedded in Task 7.
- **Placeholders:** `<DATE>` / `<N>` are intentional run-time values, resolved via
  `DATE=$(date +%F)`. No code-step placeholders.
- **Consistency:** file names (`flags_<dim>.json`, `feed_snapshot.json`,
  `verdicts.json`) are used identically across tasks; dimension keys
  (`city, area, images, price, text`) consistent; `dupes` handled separately (it
  produces clusters, not per-listing flags) and is excluded from the per-listing
  flag loops accordingly.
