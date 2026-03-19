# V2 Roadmap

Last updated: 2026-03-18

## Purpose

This document defines the canonical v2 roadmap for KazaVerde as the current AREI consumer proof-of-concept surface.

It separates genuine next-stage product work from launch-critical work that still belongs to MVP stabilization.

## Roadmap rule

Nothing in this document overrides:
- `docs/GOVERNANCE.md`
- `docs/02-data-engine/data-trust-rules.md`
- `docs/03-product/mvp-scope.md`
- `docs/05-quality-control/launch-risks.md`

If a v2 idea conflicts with those documents, the idea is not ready.

## What v2 means here

V2 means:
- the next meaningful product stage after the current MVP is coherent
- stronger market intelligence
- cleaner product positioning
- better delivery quality
- better documentation and tooling continuity

V2 does not mean:
- a random backlog of attractive features
- a silent reintroduction of marketplace behavior
- a replacement for unresolved launch blockers

## Current launch-to-v2 boundary

These items are still launch/MVP truth work, not v2:
- fixing product-position drift
- stabilizing the public feed contract
- removing misleading or stale claims
- making image delivery reliable
- clarifying newsletter and compliance flows
- verifying SEO baseline
- deciding Portuguese launch quality

V2 starts after those basics are coherent enough that the product story is stable.

## V2 priorities

### P1. Real market-history layer

Goal:
- replace approximate market trend presentation with real historical time-series data

Why it matters:
- current Market trend is explicitly approximate and marked coming soon
- historical inventory movement is one of the clearest ways to prove index value

Likely scope:
- tracked inventory over time
- historical price medians where sample quality permits
- history windows by island

Dependencies:
- reliable historical snapshot or reporting pipeline
- clear methodology rules for insufficient sample sizes

Current blocker:
- current product does not yet have canonical historical series

### P2. Stronger market analytics

Goal:
- deepen the market-data surface without pretending the data is stronger than it is

Likely scope:
- price per square meter where area coverage is strong enough
- better per-island distribution views
- improved methodology transparency
- island-specific market summaries

Dependencies:
- stronger price and size coverage
- trust rules for small samples and missing data

### P3. Better image delivery architecture

Goal:
- move from fragile third-party browsing dependence toward controlled image delivery for the consumer experience

Why it matters:
- image reliability is already a launch blocker
- better image infrastructure is both a launch-hardening and v2 quality move

Likely scope:
- controlled asset copying or proxying for display images
- responsive variants
- caching rules
- gallery performance improvements

Dependencies:
- platform architecture decisions
- storage and cost rules

### P4. Better search and filter depth

Goal:
- expand discovery only when the data supports it cleanly

Likely scope:
- property type filter
- bedrooms filter
- city filter
- size-related filters where structured data quality is strong enough

Not allowed:
- shipping filters whose underlying data is too sparse or inconsistent

Dependencies:
- better structured field coverage
- explicit trust thresholds for each added filter

### P5. Stronger detail-page context

Goal:
- make detail pages more useful without changing the product into a marketplace

Likely scope:
- better similar-listing logic
- more useful location context
- clearer market context modules
- richer source and freshness presentation

Dependencies:
- stable product position
- stronger supporting market data

### P6. Better saved-state product quality

Goal:
- improve usefulness of saved behavior while staying honest about persistence and scope

Possible scope:
- better unavailable-state messaging
- save-related sorting or grouping
- clearer save counts and browse return flows

Not yet implied:
- account system
- cross-device sync
- alerts

### P7. Cleaner About and trust surfaces

Goal:
- align public explanations with governance and canonical trust docs

Likely scope:
- revise source explanation language
- revise dedup explanation language
- remove claims that overstate what is currently canonical

This is partly cleanup, partly v2 trust hardening.

### P8. Broader Cape Verde depth before broader consumer breadth

Goal:
- improve the Cape Verde surface before expanding consumer complexity into many markets

Likely scope:
- better Cape Verde source coverage
- stronger island-level market views
- stronger launch-to-post-launch measurement

Strategic rule:
- one coherent beachhead is more valuable than shallow breadth

## Explicitly deferred beyond current v2

These ideas may be real later, but should not distort the near-term roadmap:
- native iPhone app as a top priority
- marketplace workflows
- owner self-serve listing flow
- broker dashboards
- messaging/contact pipelines
- premature multi-market consumer portal launch
- commercial API packaging before the public truth layer is stable

## Roadmap tensions already visible in the repo

These contradictions should stay visible:

1. Core public copy is now more aligned, but remaining editorial and legacy explanations still need a full governance pass.
2. Seller and rental ideas should stay outside the public surface unless they become explicit future product commitments.
3. The Market page contains an approximate trend module while the strategic direction wants trustworthy market intelligence.
4. Some older docs still encourage broader generic expansion narratives before the canonical product story is locked.

These are not reasons to abandon v2 planning. They are reasons to keep v2 anchored in documented truth.

## Recommended v2 execution order

1. Replace approximate market trends with real historical data.
2. Expand trustworthy market analytics where data quality supports it.
3. Improve image delivery and browsing reliability.
4. Expand filters only after structured data quality justifies them.
5. Improve detail-page context and saved-state quality.
6. Align public trust and About surfaces with governance.

## Exit condition for this roadmap phase

This roadmap phase is successful when KazaVerde moves from:
- a launch-constrained proof surface with visible contradictions

to:
- a stable, trustworthy Cape Verde market index with stronger analytics, clearer product truth, and fewer mismatches between governance, docs, and UI.
