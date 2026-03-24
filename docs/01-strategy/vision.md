# Vision

Last updated: 2026-03-24

## Purpose

This document defines the canonical company-level strategy for Africa Real Estate Index (AREI).

It explains what AREI is, why it exists, what strategic problem it solves, and how local market surfaces fit into the broader model.

## What AREI Is

AREI is a real estate data platform for fragmented African property markets.

Its core asset is not a generic consumer website. Its core asset is:
- source discovery
- ingestion reliability
- normalization
- trust-preserving public data contracts
- market-by-market coverage that remains legible and scalable

The long-term goal is to make fragmented property markets more searchable, comparable, and understandable without weakening data integrity.

## What AREI Is Not

AREI is not:
- a generic SaaS product
- a marketplace-first company
- a lead-gen shell wrapped around weak data
- a UI-first project whose strategy changes with each tool or design cycle

Any framing that starts by treating the project as a normal CRM, portal SaaS, or marketplace stack misses the actual shape of the business.

## Why This Company Exists

African real estate data is fragmented by source, format, geography, quality, and language.

That fragmentation creates a structural opportunity:
- public inventory is spread across many local sites
- the same property appears in inconsistent ways across the market
- prices, locations, and specs are often incomplete or poorly structured
- the burden of comparison falls on the user

AREI exists to reduce that fragmentation through normalization and trust-preserving indexing.

## Core Problem In African Real Estate Data

In many markets, users do not face a discovery problem alone. They face a trust and legibility problem.

The challenge is not simply that listings are hard to find. The challenge is that public market information is often:
- duplicated across sources
- incomplete at the field level
- inconsistent in location structure
- uneven in freshness and media quality
- difficult to compare across sites

That makes a disciplined data layer more strategically important than a thin frontend built on weak inventory assumptions.

## Strategic Thesis

AREI should become the trusted data layer for fragmented African property markets by doing four things well:
- finding and maintaining source coverage market by market
- normalizing messy public inventory into coherent structures
- enforcing trust-aware public data contracts instead of raw-volume dumping
- turning market-specific complexity into usable public and commercial surfaces

A strong property data layer can support more than one surface over time:
- consumer search and market intelligence
- internal or partner-facing research tools
- premium analytics
- API or data licensing
- future commercial products built on normalized market structure

But those opportunities only become durable if the normalized data layer is real, disciplined, and scalable.

## Defensibility And Moat

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

## Business Model Direction

AREI should be built as a platform that can support multiple surface types without losing data discipline.

The company should stay open to several business-model paths:
- consumer market discovery and market-intelligence surfaces
- internal or partner research products
- premium analytics and reporting
- API or data licensing
- future commercial products built on normalized market structure

The strategic rule is that monetization should grow out of a real data advantage, not replace it.

## Platform Model: AREI vs Local Consumer Surfaces

AREI is the parent platform and data engine.

Local consumer surfaces are market-specific expressions of that platform.

Those surfaces should:
- expose the value of the normalized data layer in a real market
- remain truthful to the current product and trust constraints
- strengthen the platform rather than redefine it

KazaVerde is the first such surface. It is not the company. It is the first public proof that the data engine can support a real product.

## Why Local Market Surfaces Matter

Local market surfaces matter because they force the platform to prove itself in public.

They make it possible to test:
- whether a normalized public feed is genuinely useful
- whether trust and quality control survive contact with a real market
- whether market context can be layered on top of listing inventory when the underlying data is strong enough

They also create a disciplined path from infrastructure to market-facing value without forcing AREI into a premature marketplace or generic portal posture.

## Strategic Sequencing Principles

The project should prioritize:
- index integrity over inventory inflation
- normalized public truth over raw scrape volume
- scalability across markets over one-off local hacks
- data trust over theatrical product confidence
- canonical repo documentation over tool-specific memory

The strongest current expression of the project is:
- a data platform with a consumer proof-of-concept surface
- launched first through one market rather than many
- governed by a read-only index doctrine
- documented through canonical repo files rather than scattered launch notes

## What Success Looks Like

Near term success:
- KazaVerde becomes a coherent, truthful Cape Verde launch surface
- trust rules, launch risks, and MVP scope are explicit and stable
- product copy and navigation stop contradicting governance
- canonical docs make the project understandable without chat history

Medium term success:
- the first market surface becomes strong enough to demonstrate real value
- the data engine remains generic and scalable
- launch and post-launch learning feed a better v2 roadmap

Long term success:
- AREI becomes the trusted data layer behind multiple products, markets, or commercial models
- expansion happens without abandoning the original discipline

## Strategic Non-Goals

AREI should not:
- chase generic SaaS framing for convenience
- pretend the current consumer surface is the whole company
- inflate inventory or claims at the expense of trust
- let marketplace language outrun actual product capability
- expand market count before the operating model is strong enough to scale

## Current Contradictions That Must Remain Visible

These are not small wording issues. They affect strategic clarity.

1. Governance defines a read-only index, but some public copy still uses aggregator framing.
2. Governance rejects marketplace behavior, and the public product should not expose seller or rental flows until the product model changes explicitly.
3. The company is best understood as a data platform, but some old docs still frame it through generic product or migration language.
4. Some older documentation describes source and dedup behavior more broadly than current governance allows.

These contradictions should be resolved explicitly, not hand-waved away.

## Relationship To Other Canonical Docs

- `docs/01-strategy/cape-verde-beachhead.md` explains why Cape Verde and KazaVerde are Market 1.
- `docs/06-go-to-market/brand-architecture.md` defines naming, brand layers, and endorsement rules.
- `docs/06-go-to-market/launch-plan.md` tracks launch execution and go / no-go readiness for KazaVerde.
- `docs/08-expansion/new-market-playbook.md` explains how future markets should be evaluated and onboarded.

## Canonical Framing

AREI is a real estate data platform for fragmented African property markets, and KazaVerde is its first consumer proof-of-concept surface: a read-only Cape Verde property index built on normalized public data and strict trust rules.
