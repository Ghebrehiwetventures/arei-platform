# Smart-by-Default Extraction Engine — Design

Date: 2026-06-04
Status: Design (pending implementation plan)
Branch context: `codex/source-ops-dev`

## 1. Problem

A `DRY_RUN` across all CV sources (2026-06-02, report in
`artifacts/cv_ingest_report.json`) showed broad field gaps concentrated in a few
sources:

- **`cv_estatecv`** (166 listings, our largest): bathrooms missing on **100%**,
  area on 54, bedrooms on 41, price on 38. All 4 detail-fetch failures were here.
- **`cv_capeverdeproperty24`** (41): bedrooms/bathrooms/area missing on ~85%, price on 18.
- **`cv_simplycapeverde`** (77): 73 junk image URLs (`pinterest.com/pin/create/button`
  social-share buttons) polluting galleries; area missing on 37.
- **`area_sqm` is weak across ≥3 sources** (estatecv 54, homescasaverde 38,
  simplycapeverde 37, capeverdeproperty24 35).

Root cause (verified, not assumed): the **active** detail extractor,
`core/detail/plugins/genericDetail.ts`, extracts beds/baths/area **only when a
source has explicit config** (`selectors`, `spec_table`, or `spec_patterns`).
With none configured it returns null, and it does **not** read JSON-LD. The
smart capabilities (JSON-LD parsing, multilingual default patterns) exist only in
**`core/genericDetailExtractor.ts`**, which is **dead code** — imported solely by
the legacy/soon-deleted `core/ingestMarket.ts` and `core/ingestCvGeneric.ts`
(see refactor plan §3.1).

So `cv_estatecv` bathrooms aren't hidden by the site — the engine simply has no
default pattern and estatecv has no config. The fix that *scales* is to raise the
engine's baseline, not hand-write config per source.

## 2. Goal & non-goals

**Goal.** Make the single surviving detail extractor understand standard
real-estate sites with near-zero config, so adding a new source becomes
`{id, name, url, lifecycle}` and config drops to a pure override. The four
extraction-broken CV sources are fixed as a side effect; future sources inherit
the capability.

**Non-goals (explicitly out of scope).**
- **Fetch-broken / blocked sources** (`cv_rightmove`, `cv_properstar`,
  `cv_greenacres`, `cv_globallistings`, `cv_capeverdepropertyuk`) — these are
  DROPPED by preflight (403 / anti-bot / SPA) and need proxy/external acquisition.
  Separate effort.
- The broader pipeline-convergence refactor (Phase A/C). This work is the
  "extend the engine" slice of **Phase B** and must remain forward-compatible
  with the target architecture, not implement it.
- Promotion to `published`. Verification stops at a green DRY_RUN coverage report.

## 3. Authoritative live-vs-dead module map (the corrected foundation)

Per `docs/operations/generic-pipeline-refactor-plan.md` §3.1 and the live import
trace.

**LIVE (modify these):**
- Curated/live-feed path: `scripts/ingest_to_curated.ts` →
  `core/pipeline/runMarketSource.ts` → `createGenericDetailPlugin`
  (`core/detail/plugins/genericDetail.ts`).
- `core/detail/plugins/genericDetail.ts` — target arch names it
  *"the ONLY detail extractor"* (`core/extractor/detail.ts`). **All engine work
  lands here.**

**DEAD — do not extend, do not import, reimplement fresh if needed:**
- `core/ingestMarket.ts` (legacy; the runner used for the 2026-06-02 report —
  fine for a one-off field-gap snapshot since extraction is shared, but not the
  live path).
- `core/genericDetailExtractor.ts` (has JSON-LD + multilingual defaults, but is
  dead — used only by legacy callers). **Reference only**, not a dependency.
- `core/ingestCvGeneric.ts`, `core/ingestCv.ts` (+`.backup`/`.save`),
  `core/parseSimplyCapeVerde.ts`, `core/parseTerraCaboVerde.ts`,
  `core/preflightCv.ts`, `core/reportCv.ts`, `markets/cv/plugins/`.
- `core/genericFetcher.ts` — survives near-term but is slated for Phase C
  deletion; do **not** add new behavior here. The universal junk-image filter
  goes in the surviving extractor's image path, not the fetcher.

## 4. Architecture — layered extraction in `genericDetail.ts`

Four layers; each is a fallback that fires only when the layer above produced
nothing for a field. This ordering guarantees sources that already extract well
(e.g. `cv_terracaboverde`) do not regress.

1. **Structured data (highest trust).** Parse `application/ld+json` (schema.org
   `Residence`/`Product`/`Offer`/`Place`), microdata (`itemprop`), and
   OpenGraph for price, bedrooms, bathrooms, area, and images. Site-agnostic;
   most Houzez/Proppy/WP-Residence themes emit it. Reimplemented fresh in
   `genericDetail.ts` using the dead `genericDetailExtractor.ts` only as a
   reference for the parse shape.
2. **Explicit config (override).** Existing `selectors` / `spec_table` /
   `spec_patterns` paths — unchanged; used when present.
3. **Multilingual labeled-regex defaults (always-on fallback).** A built-in
   `DEFAULT_SPEC_PATTERNS` (EN/PT/FR/DE: bed·quarto·chambre·schlafzimmer,
   bath·banheiro·salle de bain, m²·m2·sqm·área·superfície) applied when layers
   1–2 leave a field null. This is what rescues `cv_estatecv` with no config.
4. **Universal junk-image filter.** Engine-level reject list applied to every
   source's gallery: social-share buttons (`pinterest.com/pin/create`, fb/x/
   whatsapp share intents), logos, sprites, icons, tracking pixels. Lives in the
   surviving extractor's image handling.

After this, `sources.yml` config is an override only for sites the engine cannot
infer.

**Honest ceiling.** This makes standard CMS / server-rendered sites near-zero
config. SPAs and anti-bot sites still need fetch-level work — the fetch-broken
bucket, out of scope.

## 5. Diagnosis-first (required before each fix)

For each target (`cv_estatecv`, `cv_capeverdeproperty24`, `cv_simplycapeverde`)
plus a healthy control (`cv_terracaboverde`):

1. Save a real detail page to `/tmp/probe.html` (not committed).
2. Run the `scripts/_diag.ts` recipe from `docs/operations/source-troubleshooting.md`
   (`_`-prefix = not committed) to see what the extractor produces vs. what the
   page contains.
3. Record **which layer** rescues each field (does the site emit JSON-LD, or
   does it need the regex defaults / an icon selector?). This keeps every engine
   change evidence-driven and tells us when a fix is genuinely generic vs.
   source-specific.

## 6. Workstreams

**W1 — Universal junk-image filter (lowest risk).** Reject social-share/logo/
sprite/pixel URLs in the extractor image path. Fixes `cv_simplycapeverde`
Pinterest junk and protects all sources.

**W2 — Multilingual default `spec_patterns`.** Always-on fallback. Fixes
`cv_estatecv` bathrooms and the cross-source `area_sqm` weakness (verify per
diagnosis that the same regex root applies).

**W3 — JSON-LD / microdata / OpenGraph layer.** Highest scalability lever.
Expected to fix `cv_capeverdeproperty24` specs and cut future config to near zero.

**W4 — Documentation & guardrails** (folded into this spec):
- Refresh `docs/current-system-truth.md`: add a **"Generic pipeline — live module
  map"** section (live entrypoint chain; *"the ONLY detail extractor =
  `core/detail/plugins/genericDetail.ts`"*; an explicit **DEAD — do not extend**
  list mirroring refactor-plan §3.1). Reconcile the stale "what runs today" lines
  that still name `ingestCv.ts`/`preflightCv.ts`/`reportCv.ts`. Link to the
  refactor plan as "where this is going."
- **Code banners (highest precedence — code outranks docs):** header in
  `genericDetail.ts` ("the ONLY live detail extractor; live path: …"); a
  `@deprecated` / `LEGACY — do not extend, see docs/current-system-truth.md`
  banner atop each dead file in §3.
- Add a pointer from `CLAUDE.md` (and the data-engine guide) to
  `docs/current-system-truth.md` so it is read before touching the pipeline.
- Document any new engine behavior in `docs/operations/engine-config-reference.md`.

## 7. Verification & definition of done

Verify through the **live curated path**, per source:

```
DRY_RUN=1 MARKET_ID=cv SOURCE_ID={id} \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

A source is done when its coverage report meets:
- **price ~100%** (exception: genuine price-on-request listings)
- **bedrooms / bathrooms ≥ 80%** (≥95% where the site has structured specs)
- **images ≥1 = 100%**, no junk URLs in galleries
- **area_sqm ≥ 80%** where the site publishes area

**Regression guard.** After each engine layer (W1–W3), re-DRY_RUN
`cv_terracaboverde` + one other currently-healthy source; their coverage must not
drop. No DB writes, no promotion — the operator drives the real run + promotion.

## 8. Sequencing

Diagnose all targets → **W1** (junk filter) → **W2** (multilingual defaults;
fixes estatecv + area sweep) → **W3** (JSON-LD; fixes capeverdeproperty24 +
scalability) → **W4** (docs/guardrails, can land alongside) → regression re-run →
per-source DRY_RUN sign-off.

## 9. Risks

- **Default patterns over-match** (e.g. grab a wrong number). Mitigation: bounded
  ranges already in `genericDetail.ts` (0–20 for rooms), fallback-only ordering,
  regression guard on healthy sources.
- **JSON-LD parsing brittleness** (malformed/array `@graph`). Mitigation:
  parse defensively, skip-on-error (the dead module's pattern), unit-test against
  saved fixtures.
- **Forward-compat with Phase A/C.** All changes live in the surviving
  `genericDetail.ts`; no new behavior added to `genericFetcher.ts` (Phase C
  delete). Junk filter placed in the image path that moves to
  `core/fetcher/parse/images.ts` later.
