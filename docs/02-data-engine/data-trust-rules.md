# Data Trust Rules

Last updated: 2026-03-18

## Purpose

This document defines the canonical trust rules for public listing data in AREI, with Cape Verde and `public.v1_feed_cv` as the current production surface.

These rules exist to protect index integrity, prevent fabricated confidence, and keep the public product aligned with the real state of the data.

## Core doctrine

1. Public product truth must come from the normalized index layer, not from raw scraped output.
2. Missing data is acceptable. Fabricated data is not.
3. Fewer listings is a correct outcome when trust gates exclude weak records.
4. The public feed is allowed to be stricter than raw visible inventory.
5. Source truth outranks UI convenience.
6. Tooling, copy, and product surfaces must describe the same trust model.

## System definition

AREI is a read-only real estate index.

For launch surfaces, the consumer product must:
- show normalized listing data
- link back to the source page
- avoid marketplace behavior that implies direct transaction handling
- avoid synthetic confidence signals that compensate for weak data

## Source truth rules

Canonical rule from governance:
- local brokers and developers are valid truth sources for ingest
- aggregators may be used for discovery only
- aggregators must not be used for direct ingest, fallback data, or volume amplification

Operational implication:
- no launch decision should depend on adding weak or convenience sources just to increase count
- source additions must be judged primarily on trust, stability, and normalization quality

## Public feed truth

Current canonical public feed for KazaVerde launch:
- object: `public.v1_feed_cv`
- market scope: Cape Verde only

Current inclusion rules:
1. `source_id ILIKE 'cv_%'`
2. `approved = true`
3. `COALESCE(is_superseded, false) = false`
4. `source_url IS NOT NULL`
5. `image_urls` is non-null and non-empty
6. `island` is one of the canonical Cape Verde islands
7. stub and test sources are excluded

This means:
- raw visible inventory and public feed inventory are not the same thing
- any KPI or launch reporting must distinguish between them

## Reporting truth

For Cape Verde, every KPI or launch report must keep these labels separate:

- Raw visible CV rows:
  `public.listings` rows for `cv_%` where `approved = true` and `is_superseded != true`
- Public feed CV rows:
  rows in `public.v1_feed_cv`

At minimum, reporting should show:
- raw visible
- public feed
- excluded no-image
- excluded invalid-island
- excluded stub/test
- price coverage over public feed

## Missing data rules

### Price

Price is optional at public feed level.

Canonical interpretation:
- a listing can remain in the public feed without a numeric price
- if price cannot be extracted reliably, the product must present a neutral fallback such as "Price on request"
- listings without numeric price must be excluded from price-based calculations

Price-based calculations include:
- median price
- price per square meter
- trend lines based on price

### Location

Location must never be guessed beyond what can be normalized with confidence.

Canonical rule:
- island must be canonical for Cape Verde launch feed eligibility
- city may be missing when the source does not support confident normalization
- product copy may say the location is incomplete, but it must not infer a city from weak text

### Images

Images are a public trust gate, not just a cosmetic enhancement.

Current launch rule:
- listings without images do not enter `public.v1_feed_cv`

Operational meaning:
- image absence is a legitimate reason to exclude a listing from the public consumer surface
- launch reporting must track how many records are lost to image gating

### Specs

Bedrooms, bathrooms, property type, and size can be missing if they cannot be reliably extracted.

Canonical rule:
- do not infer structured specs from weak evidence
- do not fill missing values with default numbers
- if the source does not support reliable extraction, the field should remain null

## Deduplication truth

Deduplication is part of trust because duplicate listings distort inventory, median calculations, and product credibility.

Canonical rule from governance:
- Layer 1 exact dedup is allowed
- Layer 2 soft dedup is allowed
- Layer 3 image-fingerprint dedup is frozen until later evidence justifies it

Implication:
- public documentation and product explanations must not describe image fingerprinting as current canonical dedup behavior unless that rule has been explicitly revised
- launch calculations should assume canonical IDs and supersession logic from the current normalized layer

## Normalization truth

Normalization is allowed when it increases consistency without inventing facts.

Allowed normalization examples:
- currency normalization for comparable display
- island mapping through canonical location rules
- text cleanup and formatting
- deduping duplicate WordPress image size variants

Not allowed:
- inventing missing price
- inventing missing location detail
- inventing missing specs
- inventing market history from current state and presenting it as measured history

## Product truth rules derived from current launch behavior

These behaviors are acceptable at launch if they are clearly labeled:

- local browser saved state without cross-device sync
- "Price on request" for listings without extractable price
- estimated overall median derived from island medians
- market-history placeholders explicitly marked as approximate or coming soon

These behaviors are not acceptable if unlabeled:

- demo-backed product surfaces presented as live feed truth
- approximate trend data presented as historical fact
- marketplace language that implies direct listing or broker workflows when the product is operating as a read-only index

## Launch thresholds that affect trust

The current Cape Verde KPI framework establishes the following trust-sensitive targets:
- price coverage >= 95 percent
- valid location coverage >= 90 percent
- listings with at least one valid image >= 90 percent
- area or bedrooms coverage >= 85 percent
- duplicate share <= 5 percent
- freshness last 30 days >= 80 percent
- at least 5 stable sources

These thresholds do not redefine feed eligibility, but they do define whether the launch surface is strong enough to present confidently.

## Fallback rules

When data is incomplete, the fallback must be neutral.

Allowed fallback patterns:
- "Price on request"
- "Insufficient data"
- omission of missing fields
- clear "coming soon" labels for unfinished analytical surfaces
- clear statement that a saved property is no longer available in the current launch feed

Disallowed fallback patterns:
- fake counts
- stale hardcoded source claims
- demo content presented as live inventory
- synthetic badges or confidence framing that hides data weakness

## Documentation and tooling rules

Every material trust decision must end in one of these places:
- an update to this document
- an update to the canonical product feed contract
- an entry in the decision log once that file exists

Chats and temporary work notes are not sufficient as final trust documentation.

## Current known tensions to resolve

The repo currently contains some behavior or copy that should be reconciled against these rules:
- some public copy still frames KazaVerde as an aggregator rather than a read-only index
- some product surfaces remain marked as coming soon rather than removed from the read-only launch scope
- some documentation describes broader dedup behavior than current governance allows
- market trend surfaces are not yet based on real historical time series

These tensions should be tracked through launch risk management rather than ignored.
