# AREI Documentation Audit

Last updated: 2026-03-18

## Purpose

This audit maps the current markdown files into the canonical AREI documentation structure defined in `docs/AREI_master_documentation_architecture.md`.

The goal is to reduce scattered documentation, preserve launch and trust knowledge, and make the repo understandable across tools.

## Proposed folder and file structure

```text
docs/
  01-strategy/
    vision.md
    market-thesis.md
    cape-verde-beachhead.md
    positioning.md
    monetization-paths.md
    luxury-vs-full-market.md
  02-data-engine/
    source-registry.md
    ingestion-architecture.md
    normalization-rules.md
    deduplication.md
    image-quality-policy.md
    data-trust-rules.md
    market-coverage-metrics.md
  03-product/
    kazaverde-product-definition.md
    mvp-scope.md
    feed-contract.md
    detail-page.md
    saved-listings.md
    search-and-filters.md
    seo-surfaces.md
    v2-roadmap.md
  04-platform/
    supabase-architecture.md
    api-layer.md
    admin-tools.md
    deployment.md
    security-baseline.md
    ai-development-guardrails.md
    tooling-handoff.md
  05-quality-control/
    launch-risks.md
    pre-launch-security-checklist.md
    qa-checklist.md
    validation-reports.md
    trust-doctrine.md
    monitoring.md
  06-go-to-market/
    brand-architecture.md
    seo-strategy.md
    social-strategy.md
    launch-plan.md
    lead-capture.md
    partner-outreach.md
  07-commercial/
    pricing-hypotheses.md
    premium-listings.md
    api-data-sales.md
    enterprise-narrative.md
    broker-agent-path.md
  08-expansion/
    source-onboarding-playbook.md
    new-market-playbook.md
    cape-verde-next-sources.md
    premium-track-strategy.md
    operational-scaling.md
  09-decisions/
    decision-log.md
    open-questions.md
    deferred-ideas.md
    rejected-ideas.md
```

## Mapping from current docs to target docs

| Current file | Target bucket | Target canonical doc | Notes |
|---|---|---|---|
| `docs/ARCHITECTURE.md` | 02 Data Engine | `02-data-engine/ingestion-architecture.md` | Strong base for generic pipeline architecture. |
| `docs/02-data-engine/generic-pipeline-guide-v2.md` | 02 Data Engine | `02-data-engine/ingestion-architecture.md` or `02-data-engine/normalization-rules.md` | Consolidate with architecture, avoid parallel explanations. |
| `docs/fingerprint_v1.md` | 02 Data Engine | `02-data-engine/deduplication.md` | Keep frozen logic, move canonical summary to dedup doc. |
| `docs/dedup_observability_triggers_v1.md` | 02 Data Engine | `02-data-engine/deduplication.md` | Observability belongs with dedup behavior. |
| `markets/cv/README.md` | 02 Data Engine | `02-data-engine/source-registry.md` and `02-data-engine/market-coverage-metrics.md` | Useful source and coverage input. |
| `markets/gh/README.md` | 02 Data Engine | `02-data-engine/source-registry.md` and `02-data-engine/market-coverage-metrics.md` | Same pattern. |
| `markets/ke/README.md` | 02 Data Engine | `02-data-engine/source-registry.md` and `02-data-engine/market-coverage-metrics.md` | Same pattern. |
| `markets/ng/README.md` | 02 Data Engine | `02-data-engine/source-registry.md` and `02-data-engine/market-coverage-metrics.md` | Same pattern. |
| `markets/bw/README.md` | 08 Expansion | `08-expansion/new-market-playbook.md` or `08-expansion/cape-verde-next-sources.md` | Expansion pipeline evidence. |
| `markets/ug/README.md` | 08 Expansion | `08-expansion/new-market-playbook.md` | Same pattern. |
| `markets/za/README.md` | 08 Expansion | `08-expansion/new-market-playbook.md` | Same pattern. |
| `markets/zm/README.md` | 08 Expansion | `08-expansion/new-market-playbook.md` | Same pattern. |
| `docs/FEED_CONTRACT.md` | 03 Product | `03-product/feed-contract.md` | Near-direct canonical input. |
| `docs/FRONTEND_DATA_COMPATIBILITY.md` | 03 Product | `03-product/kazaverde-product-definition.md` or `03-product/mvp-scope.md` | Keep only decisions and constraints, not migration-era framing. |
| `docs/FINAL_POC_SUMMARY.md` | 01 Strategy | `01-strategy/vision.md` and `01-strategy/market-thesis.md` | Use as supporting evidence, not terminal doc. |
| `docs/POC_RESULTS.md` | 02 Data Engine | `02-data-engine/market-coverage-metrics.md` | Strong quantitative input. |
| `docs/kaza-verde-cv-dominated-kpi.md` | 05 Quality Control | `05-quality-control/launch-risks.md` and `05-quality-control/qa-checklist.md` | KPI thresholds should inform launch readiness. |
| `docs/06-go-to-market/launch-plan.md` | 06 Go To Market | `06-go-to-market/launch-plan.md` | Near-direct canonical input. |
| `docs/kazaverde_deploy_contract.md` | 04 Platform | `04-platform/deployment.md` | Canonical deploy truth. |
| `docs/04-platform/vercel-deploy.md` | 04 Platform | `04-platform/deployment.md` | Consolidate monorepo deploy details. |
| `arei-admin/DEPLOY.md` | 04 Platform | `04-platform/deployment.md` and `04-platform/admin-tools.md` | Admin deployment plus admin surface context. |
| `arei-admin/FAS1_VERIFICATION.md` | 05 Quality Control | `05-quality-control/validation-reports.md` or `05-quality-control/qa-checklist.md` | Verification procedure should become a repeatable QC artifact. |
| `packages/arei-sdk/README.md` | 04 Platform | `04-platform/api-layer.md` | Good input for public data access model. |
| `docs/ADD_NEW_MARKET.md` | 08 Expansion | `08-expansion/new-market-playbook.md` | Strong starting point. |
| `docs/MIGRATION_LOVABLE_TO_LOCAL.md` | 04 Platform | `04-platform/tooling-handoff.md` | Keep only enduring repo/tooling knowledge. |
| `archive/web/README.md` | 04 Platform | `04-platform/tooling-handoff.md` | Historical migration staging context, not active repo structure. |
| `docs/GOVERNANCE.md` | Cross-cutting | Keep as root canonical governance doc | Should remain top-level and referenced everywhere. |
| `docs/README.md` | Cross-cutting | Keep as root docs entrypoint | Should point to governance, architecture, and audit. |

## Missing critical docs

These are the most important missing canonical docs right now:

- `04-platform/deployment.md`
- `05-quality-control/qa-checklist.md`
- `05-quality-control/trust-doctrine.md`
- `08-expansion/new-market-playbook.md`
- `02-data-engine/source-registry.md`

Important secondary gaps:

- `01-strategy/positioning.md`
- `02-data-engine/source-registry.md`
- `02-data-engine/market-coverage-metrics.md`
- `04-platform/deployment.md`
- `05-quality-control/qa-checklist.md`
- `05-quality-control/trust-doctrine.md`
- `08-expansion/new-market-playbook.md`

## Recommended minimal first wave to create now

1. `04-platform/deployment.md`
2. `05-quality-control/qa-checklist.md`
3. `05-quality-control/trust-doctrine.md`
4. `08-expansion/new-market-playbook.md`
5. `02-data-engine/source-registry.md`

## Recommended creation order

1. Create `04-platform/deployment.md`.
Reason: deployment truth is operationally important and currently split across multiple docs.

2. Create `05-quality-control/qa-checklist.md`.
Reason: launch risks now exist, so recurring verification steps should become canonical.

3. Create `05-quality-control/trust-doctrine.md`.
Reason: trust rules exist, but the higher-level quality and product philosophy should also be explicit.

4. Create `08-expansion/new-market-playbook.md`.
Reason: market expansion already exists in legacy docs and should be promoted into the canonical structure.

5. Create `02-data-engine/source-registry.md`.
Reason: source truth and source status should become easier to understand without reading scattered market docs.

## Consolidation guidance

- Keep `docs/GOVERNANCE.md` as a root rule document rather than burying it in numbered folders.
- Treat `docs/AREI_master_documentation_architecture.md` as the canonical structure doc, not a one-off note.
- Treat current docs as source material to merge forward, not as permanent parallel truth.
- Prefer a small number of canonical docs over many overlapping markdown files.
- Preserve launch, trust, feed, and v2 knowledge even when rewriting file locations and names.
- Keep security baseline policy separate from AI workflow guardrails.
- Keep the docs tool agnostic and avoid references that only make sense inside one assistant workflow.
