# Vision

Last updated: 2026-03-18

## Purpose

This document defines the canonical vision for Africa Real Estate Index (AREI) and the role KazaVerde plays inside it.

It exists to keep the project framed correctly across strategy, product, data, and documentation work.

## What AREI is

AREI is a real estate data platform for fragmented African property markets.

Its core asset is not a generic consumer website. Its core asset is:
- source discovery
- ingestion reliability
- normalization
- trust-preserving public data contracts
- market-by-market coverage that remains legible and scalable

The long-term goal is to make fragmented property markets more searchable, comparable, and understandable without weakening data integrity.

## What AREI is not

AREI is not:
- a generic SaaS product
- a marketplace-first company
- a lead-gen shell wrapped around weak data
- a UI-first project whose strategy changes with each tool or design cycle

Any framing that starts by treating the project as a normal CRM, portal SaaS, or marketplace stack misses the actual shape of the business.

## What KazaVerde is

KazaVerde is the first consumer proof-of-concept surface for AREI.

Its role is to prove that:
- a normalized public feed can support a useful consumer experience
- trust and quality control can survive contact with a real market
- AREI can present a coherent public surface without abandoning its data discipline
- market context can be layered on top of listing inventory when the underlying data is strong enough

KazaVerde is not the company.

It is the first market surface and the first public proof that the data engine can support a real product.

## Core company thesis

African real estate data is fragmented by source, format, geography, quality, and language.

That fragmentation creates a structural opportunity:
- public inventory is spread across many local sites
- the same property appears in inconsistent ways across the market
- prices, locations, and specs are often incomplete or poorly structured
- the burden of comparison falls on the user

AREI exists to reduce that fragmentation through normalization and trust-preserving indexing.

## Why this matters

A strong property data layer can support more than one surface over time:
- consumer search and market intelligence
- internal or partner-facing research tools
- premium analytics
- API or data licensing
- future commercial products built on normalized market structure

But those opportunities only become durable if the normalized data layer is real, disciplined, and scalable.

## Strategic priorities

The project should prioritize:
- index integrity over inventory inflation
- normalized public truth over raw scrape volume
- scalability across markets over one-off local hacks
- data trust over theatrical product confidence
- canonical repo documentation over tool-specific memory

## Current position

As of now, the strongest current expression of the project is:
- a data platform with a consumer proof-of-concept surface
- launched first through Cape Verde
- governed by a read-only index doctrine
- still moving from scattered launch notes toward canonical documentation

## Strategic implication for product framing

The recommended near-term framing for KazaVerde is:
- transparent Cape Verde property index
- with market data portal characteristics

This is stronger and more truthful than:
- "aggregator" language that suggests undifferentiated volume
- marketplace language that implies workflows the product does not currently support
- generic proptech/SaaS framing that hides the actual moat

## The real moat

The durable advantage is not a pretty frontend by itself.

The durable advantage is the combination of:
- config-driven multi-market ingestion
- normalization discipline
- trust-aware public feed design
- consistent quality control
- the ability to expand market by market without rewriting the system for each country

The repo already contains evidence for this:
- same ingestion architecture across multiple markets
- YAML-driven source configuration
- market-specific location mapping through configuration
- public-feed gating rather than raw-volume dumping

## What success looks like

Near term success:
- KazaVerde becomes a coherent, truthful Cape Verde launch surface
- trust rules, launch risks, and MVP scope are explicit and stable
- product copy and navigation stop contradicting governance
- canonical docs make the project understandable without chat history

Medium term success:
- the Cape Verde market surface becomes strong enough to demonstrate real value
- the data engine remains generic and scalable
- launch and post-launch learning feed a better v2 roadmap

Long term success:
- AREI becomes the trusted data layer behind multiple products, markets, or commercial models
- expansion happens without abandoning the original discipline

## Current contradictions that must remain visible

These are not small wording issues. They affect strategic clarity.

1. Governance defines a read-only index, but some public copy still uses aggregator framing.
2. Governance rejects marketplace behavior, and the public product should not expose seller or rental flows until the product model changes explicitly.
3. The company is best understood as a data platform, but some old docs still frame it through generic product or migration language.
4. Some older documentation describes source and dedup behavior more broadly than current governance allows.

These contradictions should be resolved explicitly, not hand-waved away.

## Canonical framing sentence

AREI is a real estate data platform for fragmented African property markets, and KazaVerde is its first consumer proof-of-concept surface: a read-only Cape Verde property index built on normalized public data and strict trust rules.
