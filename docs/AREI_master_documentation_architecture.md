# AREI Master Documentation Architecture

Last updated: 2026-03-18

## Purpose

This document defines the master documentation structure for Africa Real Estate Index (AREI) and KazaVerde.

It exists to solve four problems:

1. Strategy and decisions are currently scattered across chats, markdown files, launch notes, and implementation threads.
2. The project is not a generic SaaS and should not be documented as one.
3. The work spans data infrastructure, consumer product, trust systems, brand, and market expansion.
4. The project must remain legible even if execution shifts between tools such as ChatGPT, Codex, Claude, Cursor, or future agents.

This document is the canonical operating structure for the project.

## Core principle

Do not force AREI into a generic SaaS framework.

AREI should be documented as:
- a real estate data platform
- with a consumer proof of concept surface
- built market by market
- where trust, coverage, normalization, and quality control matter as much as UI

KazaVerde is the first market surface, not the whole company.

## Recommended top level structure

```text
AREI/
├── 01 Strategy/
├── 02 Data Engine/
├── 03 Product/
├── 04 Platform/
├── 05 Quality Control/
├── 06 Go To Market/
├── 07 Commercial/
├── 08 Expansion/
└── 09 Decisions/
```

## 01 Strategy

Purpose: define the thesis, positioning, and market logic.

Recommended files:
- `01-strategy/vision.md`
- `01-strategy/market-thesis.md`
- `01-strategy/cape-verde-beachhead.md`
- `01-strategy/positioning.md`
- `01-strategy/monetization-paths.md`
- `01-strategy/luxury-vs-full-market.md`

## 02 Data Engine

Purpose: document the real core asset of the business.

Recommended files:
- `02-data-engine/source-registry.md`
- `02-data-engine/ingestion-architecture.md`
- `02-data-engine/normalization-rules.md`
- `02-data-engine/deduplication.md`
- `02-data-engine/image-quality-policy.md`
- `02-data-engine/data-trust-rules.md`
- `02-data-engine/market-coverage-metrics.md`

## 03 Product

Purpose: define the consumer product and feature scope clearly.

Recommended files:
- `03-product/kazaverde-product-definition.md`
- `03-product/mvp-scope.md`
- `03-product/feed-contract.md`
- `03-product/detail-page.md`
- `03-product/saved-listings.md`
- `03-product/search-and-filters.md`
- `03-product/seo-surfaces.md`
- `03-product/v2-roadmap.md`

## 04 Platform

Purpose: make the underlying system legible to any tool or future contributor.

Recommended files:
- `04-platform/supabase-architecture.md`
- `04-platform/api-layer.md`
- `04-platform/admin-tools.md`
- `04-platform/deployment.md`
- `04-platform/tooling-handoff.md`

## 05 Quality Control

Purpose: protect trust and prevent fake or misleading product behavior.

Recommended files:
- `05-quality-control/launch-risks.md`
- `05-quality-control/qa-checklist.md`
- `05-quality-control/validation-reports.md`
- `05-quality-control/trust-doctrine.md`
- `05-quality-control/monitoring.md`

## 06 Go To Market

Purpose: define how attention and demand will be created.

Recommended files:
- `06-go-to-market/brand-architecture.md`
- `06-go-to-market/seo-strategy.md`
- `06-go-to-market/social-strategy.md`
- `06-go-to-market/launch-plan.md`
- `06-go-to-market/lead-capture.md`
- `06-go-to-market/partner-outreach.md`

## 07 Commercial

Purpose: document how value may actually be captured.

Recommended files:
- `07-commercial/pricing-hypotheses.md`
- `07-commercial/premium-listings.md`
- `07-commercial/api-data-sales.md`
- `07-commercial/enterprise-narrative.md`
- `07-commercial/broker-agent-path.md`

## 08 Expansion

Purpose: avoid chaos when adding new sources, markets, and products.

Recommended files:
- `08-expansion/source-onboarding-playbook.md`
- `08-expansion/new-market-playbook.md`
- `08-expansion/cape-verde-next-sources.md`
- `08-expansion/premium-track-strategy.md`
- `08-expansion/operational-scaling.md`

## 09 Decisions

Purpose: stop decisions from disappearing into chats.

Recommended files:
- `09-decisions/decision-log.md`
- `09-decisions/open-questions.md`
- `09-decisions/deferred-ideas.md`
- `09-decisions/rejected-ideas.md`

## Mapping from generic SaaS framework to AREI

Use this only as a translation layer.

- Idea, Validation, Planning -> `01 Strategy`
- Design, Development -> `03 Product`, `04 Platform`
- Infrastructure, Testing -> `02 Data Engine`, `05 Quality Control`
- Launch, Acquisition, Distribution -> `06 Go To Market`
- Conversion, Revenue -> `07 Commercial`
- Growth, Scaling -> `08 Expansion`

Do not let the generic SaaS map override the actual needs of the project.

## Documentation rules

1. Every important project thread should end in one of three places:
   - updated canonical doc
   - decision log entry
   - roadmap entry
2. Chats are working memory, not final documentation.
3. Demo or placeholder behavior must be explicitly documented as temporary.
4. Every launch relevant trust issue must have:
   - risk statement
   - severity
   - mitigation
   - status
5. Any tool handoff must be possible with docs alone.
6. If execution moves between tools, the project should not lose context.

## Immediate priority docs to create or consolidate

These are the minimum high value documents to lock down now:

1. `01-strategy/vision.md`
2. `01-strategy/cape-verde-beachhead.md`
3. `02-data-engine/data-trust-rules.md`
4. `03-product/mvp-scope.md`
5. `03-product/v2-roadmap.md`
6. `05-quality-control/launch-risks.md`
7. `06-go-to-market/launch-plan.md`
8. `04-platform/tooling-handoff.md`
9. `09-decisions/decision-log.md`

## Operating instruction for tools

We need to stop treating the project docs as scattered chat residue and move toward a canonical AREI documentation structure.

Please do not frame the project as a generic SaaS. It is a data platform with a consumer proof of concept surface.

Immediate goal:
1. audit existing markdown files and place each into one of these buckets
2. identify missing critical docs
3. propose a minimal first wave of canonical docs to create now
4. preserve all important launch, trust, feed, and v2 knowledge
5. ensure the docs are tool agnostic so context survives across ChatGPT, Codex, Claude, Cursor, and future tools

Most important near term canonical docs:
- vision
- Cape Verde beachhead thesis
- data trust rules
- MVP scope
- v2 roadmap
- launch risks
- launch plan
- tooling handoff
- decision log
