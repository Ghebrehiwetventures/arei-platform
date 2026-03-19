# MVP Scope

Last updated: 2026-03-18

## Purpose

This document defines the canonical MVP scope for the current KazaVerde launch surface.

KazaVerde is the consumer proof of concept surface for AREI in Cape Verde. It is not the whole company and it is not the product scope for all future markets.

## Product definition

Current MVP position:
- KazaVerde is a read-only Cape Verde property index
- it aggregates normalized public listing data into a searchable consumer surface
- it links every listing back to the original source
- it provides light market context where the underlying data is strong enough

Current MVP is not:
- a marketplace
- a broker workflow
- a lead-routing product
- a direct owner-listing platform
- a rentals product
- a mobile app program

## Canonical data scope

The MVP runs on:
- `public.v1_feed_cv`
- Cape Verde listings only
- buy listings only

Consumer sites must read the normalized public feed through `arei-sdk`, not directly from raw tables.

## Launch-critical in-scope surfaces

These surfaces are part of the MVP and must be truthful enough for public use.

### Listings discovery

Required behavior:
- users can browse the Cape Verde launch feed
- island filter works
- price bucket filter works
- pagination works
- listing cards come from live feed-backed data

Not required in MVP:
- city filter
- bedrooms filter
- property type filter
- size filter
- map search

### Listing detail page

Required behavior:
- detail page resolves a live listing by ID from the launch feed
- title, price state, location, images, description, and available specs are shown when present
- external CTA is the source link, not a marketplace action
- similar listings can be shown if derived from real feed data
- missing fields remain missing rather than fabricated

Required trust rules:
- "Price on request" is acceptable
- source link must remain available
- detail page must not imply agent contact, direct transaction flow, or guaranteed freshness beyond the last verified state

### Saved listings

Required behavior:
- users can save listings locally in their browser
- saved page resolves current launch-feed listings by saved IDs
- unavailable saved items are explicitly reported as no longer available in the current launch feed

Not in MVP:
- cross-device sync
- user accounts
- saved-search alerts
- cloud persistence

### Market data page

Required behavior:
- total tracked inventory is shown from real tracked public listings
- island-level median price is shown where price sample quality supports it
- listing distribution by island is shown
- methodology is explained in plain terms

Allowed with explicit labeling:
- estimated overall median derived from island medians

Not acceptable:
- synthetic history presented as measured history
- unlabeled approximations

### About and trust framing

Required behavior:
- explain that KazaVerde is a read-only index
- explain that coverage is meaningful but not complete
- explain that listings link back to source pages
- explain that missing or incomplete fields are normal in a fragmented market

## Launch-critical operational scope

These are part of MVP readiness even though they are not purely UI features:
- launch feed contract is stable
- deploy path is documented and production is verified on `https://kazaverde.com`
- sitemap and robots are correct
- Search Console ownership is verified
- privacy and newsletter compliance are clear
- Portuguese quality is either launch-ready or intentionally deferred

## Explicit non-goals for this MVP

The following are outside the current MVP and should not quietly creep into launch scope:

- direct seller onboarding
- owner self-serve listing submission
- rentals launch
- broker dashboards
- transaction workflows
- messaging or contact funnels
- map-based search experience
- native iPhone app v2
- broad multi-market consumer rollout
- enterprise API packaging

## Deferred but real work

These are valid future items, but not required for the current MVP to be coherent:
- real inventory trend history
- price per square meter where coverage supports it
- richer per-island market analytics
- stronger city-level search and filtering
- better image delivery infrastructure
- Portuguese expansion beyond minimum launch quality
- broader data-source expansion in Cape Verde

## Current product truth by surface

### Home

Current truth:
- live listings and market stats are loaded from the launch feed and related market stats queries
- the site presents multiple tracked sources and island coverage
- the hero now uses read-only index framing rather than aggregator language

### Listings

Current truth:
- launch feed-backed discovery is present
- current v1 filters are intentionally narrow

### Detail

Current truth:
- data is feed-backed
- CTA is `VIEW ON SOURCE`
- gallery supports real listing images where present

### Saved

Current truth:
- saved IDs are stored locally in browser storage
- launch feed availability is checked live

### Market

Current truth:
- total tracked inventory and island medians are feed-backed

Current limitation:
- inventory trend is approximate and explicitly marked coming soon

### Sell and Rent

Current truth:
- sell and rent flows are not part of the public KazaVerde routing or launch surface

Canonical MVP interpretation:
- these are outside the current launch scope
- they should not define the product position

## Scope boundaries that must remain hard

1. Read-only index truth outranks marketplace ambition.
2. Feed-backed product truth outranks demo convenience.
3. Narrow but reliable filters outrank broad but weak search.
4. Cape Verde launch quality outranks premature multi-market consumer rollout.
5. Launching a coherent website outranks launching parallel app or marketplace ideas.

## Exit criteria for MVP coherence

The MVP is coherent when all of the following are true:
- product position is consistently read-only index / market data portal
- public feed contract is stable and reflected in product behavior
- no core page makes fake or stale claims
- saved behavior is accurately described as local-only
- market analytics are either real or clearly labeled as estimated / coming soon
- legal and compliance basics are not missing
- launch blockers are tracked explicitly rather than hidden in chat history
