# Launch Risks

Last updated: 2026-03-18

## Purpose

This document is the canonical launch risk register for the current KazaVerde main-stage push.

It focuses on risks that could damage trust, distort product position, or create a false sense of launch readiness.

## Status scale

- `open`: unresolved and launch-relevant
- `mitigating`: active fix path exists but not fully closed
- `accepted`: known limitation accepted for current launch state
- `closed`: resolved with current evidence

## Severity scale

- `critical`: should block main-stage launch
- `high`: can materially damage trust or positioning
- `medium`: meaningful weakness that can be controlled temporarily
- `low`: should be cleaned up but does not define launch safety

## Risk register

### R1. Product position drift

- Severity: `critical`
- Status: `mitigating`

Risk statement:
KazaVerde is supposed to launch as a read-only index / market data surface, but parts of the product and documentation still imply broader marketplace intent or generic aggregator framing.

Current evidence:
- governance defines the system as a read-only real estate index
- launch plan recommends a transparent Cape Verde property index / market data portal position
- primary navigation no longer promotes `SELL`, `RENT`, or `LIST PROPERTY`
- `SELL` and `RENT` are no longer part of the public KazaVerde routing surface
- Home, About, footer, and metadata now use read-only index framing
- selected legacy editorial copy still needs a full framing review

Why it matters:
- mixed framing weakens trust
- users cannot tell whether the product is an index, a marketplace, or a future listing platform
- launch messaging becomes unstable across pages and tools

Mitigation:
- align public copy around read-only index positioning
- ensure non-MVP surfaces do not define the main product story
- make future-marketplace ideas explicit as out of current launch scope

Close condition:
- core pages, explanatory routes, and editorial copy describe one clear position without contradictory product promises

### R2. Trust gaps between raw inventory and public feed

- Severity: `critical`
- Status: `mitigating`

Risk statement:
If launch reporting or product copy blurs the difference between raw visible inventory and the public launch feed, public claims can become misleading.

Current evidence:
- `public.v1_feed_cv` is stricter than raw visible inventory
- launch feed excludes missing-image, invalid-island, and stub/test rows
- launch plan already distinguishes raw visible vs public feed

Why it matters:
- inflated counts or unclear coverage language undermine trust
- product and KPI reporting can drift from each other

Mitigation:
- keep feed contract canonical
- preserve separate reporting for raw visible vs public feed
- ensure public coverage statements are tied to current launch-feed truth

Close condition:
- all launch reporting and consumer-facing count language use the same canonical feed definitions

### R3. Price coverage below launch target

- Severity: `high`
- Status: `open`

Risk statement:
Numeric price coverage is currently below the Cape Verde dominance target, reducing the strength of market stats and some consumer decisions.

Current evidence:
- launch plan records price coverage at 82.6 percent
- current KPI target is 95 percent
- listings without extractable price are still allowed in the public feed

Why it matters:
- market medians have weaker coverage
- users encounter more "Price on request" listings than desired
- the product feels less complete even if it remains truthful

Mitigation:
- improve extraction on high-value sources where price is present but not currently normalized
- keep "Price on request" as a neutral fallback
- avoid overstating the strength of price-based analytics

Close condition:
- price coverage reaches target or a lower threshold is intentionally re-baselined in canonical docs

### R4. Image reliability and performance

- Severity: `critical`
- Status: `open`

Risk statement:
The product currently depends on third-party source images for browsing, creating both reliability and performance risk.

Current evidence:
- launch plan marks image reliability and performance as a real launch blocker
- public feed requires image presence, but image presence does not guarantee good delivery speed or stability

Why it matters:
- slow or broken images damage perceived quality immediately
- detail galleries and listing browsing become unreliable on mobile
- trust suffers even when listing data itself is valid

Mitigation:
- move display images under infrastructure we control where needed
- apply responsive sizing, caching, and preloading rules
- test gallery performance on mobile and desktop

Close condition:
- image delivery is stable enough for normal browsing across core pages and devices

### R5. Demo or approximate behavior leaking into live truth

- Severity: `high`
- Status: `open`

Risk statement:
Some product surfaces still rely on approximate or transformed behavior that can be misunderstood as measured live truth.

Current evidence:
- Market inventory trend is generated approximately from current total and marked coming soon
- launch plan states inventory trend should remain clearly marked as non-historical until real history is used
- older migration-era docs and demo-era structures still exist in the repo

Why it matters:
- faux precision damages credibility
- analytics claims become hard to defend

Mitigation:
- keep approximations visibly labeled
- avoid presenting synthetic history as measured history
- migrate canonical knowledge into the new doc structure and retire conflicting legacy notes over time

Close condition:
- either the approximate behavior is removed or real historical data replaces it

### R6. Saved experience mismatch

- Severity: `medium`
- Status: `mitigating`

Risk statement:
Saved listings are local-browser only, and availability depends on the current launch feed. That is correct, but user expectations can still drift if the product overpromises persistence.

Current evidence:
- current Saved page states that bookmarks are stored locally in the browser
- unavailable saved items are explicitly counted and surfaced
- launch plan notes that misleading saved sync claims have been removed

Why it matters:
- saved behavior is a trust surface because users expect persistence
- any return of implied sync behavior would create silent disappointment

Mitigation:
- keep local-only wording explicit
- do not introduce account-like language until true sync exists

Close condition:
- saved behavior remains consistently described across UI and docs

### R7. Portuguese launch quality not yet locked

- Severity: `high`
- Status: `open`

Risk statement:
Portuguese is intended for launch quality, but the repo still treats language completeness as unfinished work.

Current evidence:
- launch plan explicitly lists Portuguese launch quality as an open item
- the requirement covers navigation, forms, newsletter, metadata, empty states, and legal pages

Why it matters:
- partial localization looks careless in a market-specific launch
- mixed-language product surfaces reduce confidence

Mitigation:
- decide whether Portuguese is launch-ready or intentionally deferred
- audit core product surfaces and legal/compliance text as one set

Close condition:
- Portuguese quality is either fully launch-ready or cleanly removed from launch promises

### R8. Newsletter and compliance ambiguity

- Severity: `high`
- Status: `open`

Risk statement:
Newsletter subscription exists, but confirmation flow, consent language, privacy posture, and cookie obligations are not yet fully locked as launch truth.

Current evidence:
- launch plan calls out newsletter confirmation experience as unfinished
- launch plan also calls out privacy, cookies, and consent checks as open work

Why it matters:
- compliance ambiguity is a trust risk even when core data product quality is strong
- brand mismatch between site and email flow can feel broken

Mitigation:
- define the exact subscription lifecycle
- make consent language explicit
- confirm whether current tracking requires a cookie notice
- align policy pages with actual product behavior

Close condition:
- newsletter flow, privacy language, and cookie posture are documented and verified

### R9. SEO readiness assumed instead of verified

- Severity: `medium`
- Status: `open`

Risk statement:
The site has public SEO assets, but indexation and Search Console readiness cannot be inferred from their presence alone.

Current evidence:
- launch plan explicitly notes that robots and sitemap are not equivalent to verified indexation
- Search Console ownership and actual index coverage remain open checks

Why it matters:
- launch readiness can be overstated
- content and landing-page priorities can drift without measurement

Mitigation:
- verify Search Console ownership
- submit sitemap
- review actual index coverage and canonical metadata

Close condition:
- SEO baseline is measured, not assumed

### R10. Documentation fragmentation

- Severity: `high`
- Status: `mitigating`

Risk statement:
Important launch, trust, and product decisions are spread across multiple markdown files and chat history, making handoff and continuity fragile.

Current evidence:
- the repo only just gained the canonical documentation architecture and audit
- launch-critical knowledge still lives across `docs/06-go-to-market/launch-plan.md`, feed docs, KPI docs, governance, and product code

Why it matters:
- execution across tools becomes inconsistent
- old documents can silently override newer decisions

Mitigation:
- create canonical docs for trust rules, MVP scope, launch risks, strategy, roadmap, tooling handoff, and decision log
- treat legacy docs as source material to consolidate forward

Close condition:
- the canonical doc set covers launch-critical knowledge well enough that a new tool can regain context from repo docs alone

### R11. Governance and public copy mismatch on source and dedup logic

- Severity: `high`
- Status: `mitigating`

Risk statement:
Some public-facing or legacy documentation describes source and dedup behavior more broadly than current governance allows.

Current evidence:
- governance says aggregators are discovery-only, not direct truth sources
- governance freezes layer-3 image-fingerprint dedup for now
- About page has been revised toward source-truth and non-fabrication language
- selected editorial and legacy copy still needs a full governance-alignment pass

Why it matters:
- project rules, public copy, and engineering logic can diverge
- future contributors may follow the wrong canonical rule

Mitigation:
- revise public and internal explanatory copy to match governance
- keep canonical trust docs explicit about what is allowed now versus later

Close condition:
- public explanations and canonical docs no longer contradict governance

## Current launch interpretation

Based on the current evidence, KazaVerde should remain in:
- soft live / controlled iteration

It should not be treated as fully main-stage ready until the critical risks above are either closed or intentionally re-baselined in canonical documentation.
