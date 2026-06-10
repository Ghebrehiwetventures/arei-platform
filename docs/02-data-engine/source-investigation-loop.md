# Source Investigation Loop (Dry-Run Agentic Loop)

Version 1.0 | 2026-06-09

Companion to:
- `docs/operations/execution-protocol.md` — truth classes, Builder/Verifier roles, done standard. This loop is the concrete procedure for a Type C (data/pipeline) and Type D (investigation) task.
- `docs/02-data-engine/kazaverde-curated-feed-operations.md` — the curated/feed lifecycle, `publish_status` states, and the production-sensitive hard rules this loop must obey.
- `docs/operations/source-troubleshooting.md` — symptom-first extraction fixes and the `scripts/_diag.ts` template.
- `docs/operations/adding-a-source.md` / `docs/operations/engine-config-reference.md` — the source playbook and every `sources.yml` option.

> Documentation never overrides live reality, current code, or verified output
> (`docs/document-precedence.md`). The counts and per-source verdicts in any
> investigation record are point-in-time, verified-in-data facts — re-verify
> against the live source and the database before acting on them.

## 1. What this is

The **source investigation loop** is the repeatable method an agent (the
Builder) runs to bring one source's data quality up to the public-feed bar,
**one source at a time**, without writing to the database until a human (the
Verifier) confirms. It was developed and proven across all ten active Cape Verde
(`cv`) sources; it is market-agnostic and applies to any source the generic
engine ingests.

The loop exists because a field gap has two very different root causes, and they
demand opposite responses:

- **🔧 SCRAPER** — the value *is* on the listing page but our extractor missed
  it. This is our bug. Fix it in the engine or config.
- **🌐 SOURCE** — the value is genuinely absent on the original listing. This is
  a real data floor. Nothing to fix; record it as accepted.
- **◑ MIXED** — some of both across the affected rows.

The discipline that makes the loop trustworthy: **every gap is classified by
opening the source**, fixes are landed test-first, and **no row reaches the live
feed without explicit human confirmation**.

The per-source loop fixes one source at a time. A complementary **whole-feed
correctness audit** (§8) periodically reviews the *entire* live feed, because the
per-source coverage checks pass on values that are present but *wrong* — a logo
in the gallery, a slug or truncated string as the title, an island that does not
match the city. Coverage answers "is the field set?"; the audit answers "is it
correct?"

## 2. Roles and truth (from the Execution Protocol)

| Role | Who | Responsibility in this loop |
|---|---|---|
| Builder | AI agent | Runs the dry-run loop, classifies gaps, lands fixes test-first, presents evidence, requests confirmation. Never publishes on its own judgment. |
| Verifier | Founder | Reviews the evidence, approves (or rejects) the live ingest, owns promotion decisions. |

Label every claim by truth class, highest wins: **verified live** (observed on
the source URL / live feed) > **verified in code** > **verified in data/output**
(query result, report JSON, test output) > **historical doc** > **unverified**.
A dry-run report is verified-in-data; a claim that "the source has no area" is
only verified-live once you have opened the page.

## 3. The loop

```
   ┌─────────────────────────────────────────────────────────────┐
   │  a. DRY-RUN one source  (no DB writes, no AI)                 │
   │  b. read coverage + spot-check                                │
   │  c. classify each gap:  🔧 SCRAPER / 🌐 SOURCE / ◑ MIXED       │
   │  d. fix SCRAPER faults test-first (engine or config)          │
   │  e. re-run dry-run → confirm recovery, full suite green       │
   └───────────────┬─────────────────────────────────────────────┘
                   │  (repeat c–e until only source-floors remain)
                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  f. PRE-LIVE GATES                                            │
   │     • final non-zero dry-run                                  │
   │     • verify each removal candidate URL by direct GET (404?)  │
   │     • direct-Postgres compare: curated vs feed                │
   │     • >>> explicit human confirmation <<<                     │
   └───────────────┬─────────────────────────────────────────────┘
                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  g. LIVE INGEST (drop DRY_RUN)                                │
   │  h. post-ingest direct-Postgres verification                  │
   │  i. promotion — separate, manual, completeness + sanity bar   │
   └─────────────────────────────────────────────────────────────┘
```

### a. Dry-run one source

`DRY_RUN=1` makes the curated path **write nothing and call no AI**. `REPORT_JSON=1`
emits a rich per-listing report.

```bash
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
# add DEBUG_GENERIC=1 for per-field extraction tracing
```

The report lands at `reports/curated/<market>_<market>_<source>.json` (e.g.
`reports/curated/cv_cv_terracaboverde.json`), is **gitignored**, and carries the
full per-listing data: price, beds/baths, area, image URLs, location,
property type, and the `source_url` you will open to classify gaps.

A dry-run that fetches **0 rows** (network/DNS failure, anti-bot block) is not
evidence of anything. The **zero-row safety gate** disables removal detection on
a failed or empty fetch so nothing is ever demoted from a non-result. Re-run when
the source is reachable.

### b. Read coverage and spot-check

Compute coverage **null-aware** over all kept rows (`listings[]`). A studio with
`bedrooms = 0` is *present*, not missing.

> Pitfall: the console summary's legacy truthiness counter treats `0` as absent,
> so it under-reports beds for studio-heavy sources. **The JSON report's
> null-aware counts are authoritative**, not the stdout line.

Then sample a handful of gap rows at random for the per-field classification in
step c. Sampling only *null* fields is not enough — also eyeball *implausible*
values (see §5 and the worked example in §7).

### c. Classify each gap

For each missing or suspect field, **open the listing's `source_url`** and apply
the recipe:

- The field is shown on the page and we have null → **🔧 SCRAPER**.
- The page never states the field → **🌐 SOURCE** (accepted floor).
- Mixed across rows → **◑ MIXED**: fix the scraper half, accept the source half.

For `json_api` sources (e.g. RE/MAX) there is no HTML page to open — the
equivalent is to re-query the API per listing ID and inspect the raw fields. A
field is a SOURCE floor only when the API value itself is `0`/null **and** every
alternate field is empty too.

See §4 for the catalog of verdicts that recur and are accepted as source floors.

### d. Fix SCRAPER faults — test first

Land scraper fixes in:
- **Engine** — `core/detail/plugins/genericDetail.ts` (detail extraction),
  `core/fetcher/` (list fetch, image parse/dedupe), `core/configLoader.ts`
  (config). Prefer raising the engine baseline so every source inherits the
  capability (the generic-first principle).
- **Config** — `markets/<market>/sources.yml` for source-specific selectors,
  spec-table maps, aliases, image scoping, currency, or pagination overrides.

Use TDD: **write a regression test that reproduces the real markup first**, watch
it fail, then fix. Use the actual DOM/JSON-LD snippet from the page that broke —
a synthetic fixture that omits the failing shape (e.g. a neighborhood name with
no trailing digits) will pass while production still breaks. To run extraction
against a saved page without a full ingest, use the `scripts/_diag.ts` template
in `source-troubleshooting.md §1` (`/tmp/probe.html` → plugin → fields).

### e. Re-run and confirm

Re-run the dry-run (step a) and confirm coverage recovered with no new
regressions, then run the **full suite**:

```bash
node --test tests/
git diff --check
```

Repeat c–e until the only remaining gaps are accepted source floors.

### f. Pre-live gates (all required before any write)

1. **Final non-zero dry-run** after the last fix — fetched > 0, enriched == fetched,
   0 detail failures, 0 skipped, coverage as expected.
2. **Verify every removal candidate.** A dry-run flags published rows absent from
   the latest fetch as *removal candidates only*. Open each one's `source_url`
   with a direct GET: a **404 / "page not found"** confirms it is genuinely gone
   and safe to demote. A live page means a false candidate — do not demote.
3. **Direct-Postgres comparison.** Compare the dry-run row set against
   `kv_curated.listings` and `public.v1_feed_cv` using `createPostgresClient()`
   and the pooler-backed `DATABASE_URL`. **Never Supabase REST/JS for `kv_curated`.**
   Confirm: which rows already exist and as what status, which are genuinely new,
   which are removal candidates, and that same-source/same-URL identity
   reconciliation finds no spurious ID churn.
4. **Explicit human confirmation.** Present the evidence and stop. The Builder
   does not start a live ingest on its own judgment.

### g. Live ingest

Drop `DRY_RUN` (keep `REPORT_JSON=1` for the post-run report):

```bash
REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

What a live ingest does, by design:
- **Existing `published` rows are refreshed in place.** `publish_status`,
  `first_seen_at`, `first_published_at`, and existing `ai_descriptions` are
  preserved on conflict; source-derived fields (price, specs, images,
  description, source URL, `last_verified_at`) are refreshed.
- **New rows enter as `needs_review`** — never straight to the public feed. AI
  descriptions are generated for them.
- **Published rows absent from this successful fetch are demoted to `removed`**
  (not `needs_review`). The zero-row gate still applies: a failed/empty fetch
  demotes nothing.

### h. Post-ingest verification (direct Postgres)

Re-query `kv_curated.listings` and `public.v1_feed_cv` and confirm the integrity
invariants:
- every source's `published` count **equals** its `v1_feed_cv` count;
- **0 feed rows are unbacked** by a published curated row (no `needs_review` leak
  into the public feed);
- no previously-published row was silently lost;
- spot-check that corrected values actually landed (e.g. a fixed area is now the
  real figure in both curated and the feed).

### i. Promotion (separate, manual)

Promotion of `needs_review` → `published` is a **distinct, human-owned step**, not
part of ingest. The current local surface is the KazaVerde `/review` dev route,
which publishes selected rows through the dev-only `POST /__kv-review/publish`
endpoint (sets `publish_status='published'`,
`first_published_at = COALESCE(first_published_at, now())`).

Completeness + sanity bar for promotion:
- price **and** bedrooms **and** bathrooms **and** `property_size_sqm` non-null,
  **and ≥ 3 images**; **and**
- **screen for implausible values, not only nulls** — e.g. reject area below the
  `MIN_PLAUSIBLE_AREA_SQM = 5` floor. A bogus 1 m² area is "present" to a
  null-only check but is not publishable (see §7).

Do not publish rows just to test the button; use query-only checks or empty
publish requests for endpoint smoke tests.

Promotion is per-source and gates on completeness, not correctness. Periodically
run the **whole-feed correctness audit (§8)** over everything already live to
catch present-but-wrong values that the per-source bar lets through.

## 4. Verdict taxonomy — recurring accepted source floors

These gaps recur across sources and are **🌐 SOURCE** floors, not scraper bugs.
Confirm per row, but expect them:

| Pattern | Why it's a source floor |
|---|---|
| POA / "Call for details" / "Price negotiated" / `ListingPrice: 0` | The source publishes no numeric price. `price = null` → `price_status = 'price_on_request'` → renders as "Price on request". Not a bad row. |
| Land / commercial rows missing beds/baths | No residential bed/bath count exists; the property-type heuristic classifies `land`/`lots` so it does not retain bogus residential values. |
| Multi-unit / project / "entire building" pages | Per-unit ranges, no single bed/bath/area to extract. Acceptable pending future AI title/description extraction. |
| Beds/baths stated only in title or prose | No structured value; deferred to planned AI field extraction. |
| `json_api` area with `TotalArea: 0` and all alternate area fields empty | No field to map (RE/MAX). |
| Partial-suite bathroom prose ("master suite with its own bathroom") | No defensible total bathroom count. |

## 5. Safety rails (invariants — never violate)

- **DRY_RUN writes nothing and calls no AI.** It is always safe to run.
- **Zero-row safety gate.** A failed or empty fetch must never demote a row.
- **`needs_review` quarantine.** New and uncertain rows never enter the public
  feed automatically; only a human promotes.
- **Direct Postgres only** for `kv_curated` reads/writes (`createPostgresClient()`
  / `DATABASE_URL`). No Supabase REST/JS.
- **Confirmation before live.** The Builder never publishes, promotes, or
  demotes on its own judgment.
- **Screen implausible, not just null.** A present-but-wrong value is worse than
  a null, because null-aware checks count it as covered.
- Do not regenerate AI descriptions for already-published rows.

## 6. Commands and artifacts (quick reference)

```bash
# Dry-run a single source (safe — no writes, no AI)
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=<m> SOURCE_ID=<m>_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts

# …with extraction tracing
DRY_RUN=1 REPORT_JSON=1 DEBUG_GENERIC=1 MARKET_ID=<m> SOURCE_ID=<m>_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts

# Live ingest (only after pre-live gates + confirmation)
REPORT_JSON=1 MARKET_ID=<m> SOURCE_ID=<m>_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts

# Tests
node --test tests/
git diff --check
```

| Artifact | Path | Notes |
|---|---|---|
| Per-listing report | `reports/curated/<m>_<m>_<source>.json` | gitignored; authoritative null-aware coverage |
| Extraction probe | `scripts/_diag.ts` + `/tmp/probe.html` | leading `_` = don't commit; delete when done |
| Engine extractor | `core/detail/plugins/genericDetail.ts` | the single live detail extractor |
| Fetcher / loader | `core/fetcher/` (incl. `parse/images.ts`, `parse/listings.ts`), `core/configLoader.ts` | list fetch, image dedupe, config |
| Source config | `markets/<m>/sources.yml` | per-source overrides |

## 7. Worked example — the `En-bv-01` area-code bug

Terra Cabo Verde detail pages expose **two** area-like fields: `Area: En-bv-01`
(a unit/neighborhood **code**) and `Sales area: 61,91 sqm` (the real figure).
`parseAreaTextSqm`'s unitless fallback pulled the code's trailing digits
(`01` → 1 m²), and DOM order let `Area:` lock in before `Sales area:` was read.
The result: impossible sub-10 m² areas on rows that the coverage report counted
as "area present", so Terra's "37/37 area" was partly bogus.

Two reasons it survived earlier passes — and the two lessons of this loop:

1. **The regression test used a code-free neighborhood name** (`Praia de Cabral`),
   so it never exercised the digit case. → *Reproduce the real markup
   (`En-bv-01`), not a convenient synthetic one.*
2. **The spot-check sampled only null fields**, and a 1 m² area is not null. → *Screen
   for implausible values, not just nulls.*

The fix (commit `6044a48`, TDD): the unitless fallback now requires a standalone
number not glued to letters/hyphens, so `En-bv-01` yields no area and the
structured `Sales area` wins; a `MIN_PLAUSIBLE_AREA_SQM = 5` floor was added as
defense-in-depth; and a new regression test reproduces the real `En-bv-01`
markup (expected 62, was 1). The corrupt rows were demoted to `needs_review`,
the source re-ingested with corrected areas, and the now-complete rows
re-promoted.

This single bug is why the promotion bar in §3.i screens implausible values and
why §5 lists "screen implausible, not just null" as an invariant.

## 8. Whole-feed correctness audit (periodic)

The per-source loop (§3) brings each source up to the bar and verifies that
`published == feed` for that source. It does **not** catch values that are
present but *wrong*: a logo or thumbnail standing in for a gallery, a URL slug or
truncated fragment surfaced as the title, an island that contradicts the city, a
plot size stored as interior area, the same property published by two sources.
A non-null title is not a correct title. The **whole-feed correctness audit** is
the cross-cutting verification that answers *"is every live value correct?"* over
the entire feed. Run it periodically and before launch-significant milestones.

**Scope.** Only `publish_status = 'published'` rows — i.e. exactly what is live on
the public feed view (`public.v1_feed_cv` for CV). Regenerate the counts at run
time; the feed drifts.

**Method — two-phase hybrid** (keeps expensive source round-trips proportional to
real suspects):

- **Phase 1 — heuristics over *all* live rows (cheap).** Pure DB reads plus
  lightweight image HEAD/GET. Each `(listing, dimension)` gets `ok` or `suspect`
  with a machine-readable reason code. Six dimensions:
  1. **City** — consistent with its island (gazetteer of island → known cities)?
  2. **Area** — a legitimate m² (not implausibly small/large, not a unit code)?
  3. **Images** — real, reachable, and belonging to this listing? Reject logos,
     social/share buttons, placeholders, sub-200px thumbnail covers, and covers
     shared across unrelated listings.
  4. **Cross-source duplicates** — same property published by more than one source?
  5. **Price** — plausible (not a unit code, not an obvious order-of-magnitude slip)?
  6. **Title / description** — clean and usable (not a slug, not truncated, not
     boilerplate)?
- **Phase 2 — confirm flagged rows only (targeted).** Re-fetch each flagged
  listing's original source (page or API) and assign a final verdict:
  **🔧 SCRAPER** / **🌐 SOURCE** / **FALSE-POSITIVE** (heuristic over-flagged; the
  value is actually fine). Bound the volume: if a dimension flags an unusually
  large share of a source (say > 40%), spot-check a representative sample and say
  so rather than fetching every page.

**Read-only guardrail.** The audit performs **no** DB writes, promotions,
demotions, ingests, or code/config edits. Its only deliverable is a findings
report a human acts on later. Fixes are then landed through the per-source loop
(§3); accepted floors are recorded per §4; FALSE-POSITIVEs tune the heuristic.

**Tooling pattern (script + agent).** An agent runs the audit using **throwaway**
`scripts/_audit_*.ts` helpers — one per dimension plus a snapshot, a Phase-2
re-fetcher, and a report assembler. The leading `_` means "do not commit"; delete
them when done (same convention as `scripts/_diag.ts` in §6). The heuristics are
analysis code, not shipped engine code, so they are **not** TDD'd and **not**
committed. The **only** committed artifact is the findings report. Reuse
`createPostgresClient()` + `DATABASE_URL` for reads (never Supabase REST).

**Reference runbook + example output.**
- Executable, self-contained runbook (every command/definition embedded):
  `docs/superpowers/specs/2026-06-08-cv-feed-deep-audit-design.md` (+ the
  task-by-task plan `docs/superpowers/plans/2026-06-08-cv-feed-deep-audit.md`).
- Example findings report from the 2026-06-08 run over 482 CV listings:
  `docs/02-data-engine/cv-feed-audit-2026-06-08.md` (per-dimension scorecard,
  per-listing verdicts, and the remediation that followed).
