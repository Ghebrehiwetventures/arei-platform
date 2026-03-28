# Rename Impact Inventory

Status: Draft
Execution state: In progress
Last updated: 2026-03-21

## Governing Reference

This inventory is governed by `docs/06-go-to-market/brand-architecture.md`.

Use this file to track naming-impact decisions before any rename is executed across:
- GitHub repo identity
- package names
- Vercel project names
- domains
- deployment docs
- scripts and config
- public naming

## Freeze Note

No GitHub repo, Vercel project, package, domain, or deployment-identifier rename is authorized by this inventory.

During the current freeze:
- read-only auditing is allowed
- documentation alignment is allowed
- impact analysis is allowed
- renames are not allowed

## Risk Scale

- `Low`: mostly documentation or metadata impact
- `Medium`: operational references need coordinated updates
- `High`: deploy wiring, integrations, or production verification may be affected

## Decision Status

- `keep`
- `rename later`
- `rename now`
- `undecided`

Current execution note:
- some metadata and repo-alignment steps may be completed before this inventory is fully closed
- any completed rename should be reflected here as current state, not left as a future plan

## 1. GitHub Repo

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub repo slug | `arei-platform` | no change | technical | GitHub repo URL; `.git/config`; deployment docs; onboarding docs | local git remotes; Vercel Git integration; deploy docs; bookmarks; onboarding docs | Medium | Rename repo back to `africapropertyindex.v4` only if a rollback is explicitly required; then restore remotes and re-check Vercel Git linkage | keep |
| Git remote URL | `https://github.com/Ghebrehiwetventures/arei-platform.git` | no change | technical | `.git/config` | local clones; CI/local onboarding; any scripts or docs that reference the remote | Medium | Restore the previous remote URL only if the GitHub repo rename itself is rolled back | keep |

## 2. Package Names

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Root package name | `arei-platform` | no change | technical | `package.json`; `package-lock.json`; docs referencing root package name | local install metadata; docs; package identity in tooling; future workspace conventions | Medium | Restore original package name and lockfile references | keep |
| Admin package name | `arei-admin` | no change | technical | `arei-admin/package.json`; `arei-admin/package-lock.json`; root `package.json`; deploy docs; `scripts/check-arei-admin-deploy.mjs` | admin Vercel project; root scripts; deploy docs; operational scripts | Medium | Restore `arei-admin` in package metadata and script references | keep |
| Consumer package name | `kazaverde-web` | no change | technical | `kazaverde-web/package.json`; `kazaverde-web/package-lock.json`; root `package.json`; deploy docs; Vercel config references | KazaVerde build chain; root scripts; Vercel config; deployment docs | Medium | Restore `kazaverde-web` in package metadata and script references | keep |
| Shared SDK package name | `arei-sdk` | no change | technical | `packages/arei-sdk/package.json`; `kazaverde-web/package.json`; `vercel.json`; `kazaverde-web/vercel.json`; docs | consumer build path; package references; internal technical docs | Medium | Restore `arei-sdk` references in package metadata and build config | keep |

## 3. Vercel Projects

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KazaVerde Vercel project | `kazaverde-web` | no change | technical | Vercel project UI; `docs/kazaverde_deploy_contract.md`; `docs/04-platform/vercel-deploy.md`; `docs/04-platform/tooling-handoff.md` | production deploys; preview URLs; deploy docs; release reporting; custom domain attachment | High | Rename project back; re-check domain attachment and build settings | keep |
| Admin Vercel project | `arei-admin` | no change | technical | Vercel project UI; `arei-admin/DEPLOY.md`; deploy scripts/docs | admin deploys; preview URLs; deploy docs; internal operations runbooks | High | Rename project back; re-check root directory and build settings | keep |
| KazaVerde preview domain pattern | `<project>.vercel.app` for `kazaverde-web` | no change | technical | `docs/kazaverde_deploy_contract.md` | preview verification; deploy reports; release checks | Medium | Revert project rename if preview URL identity causes confusion | keep |

## 4. Domains

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KazaVerde production domain | `kazaverde.com` | no change | public | `docs/kazaverde_deploy_contract.md`; `docs/04-platform/vercel-deploy.md`; `docs/04-platform/tooling-handoff.md`; `kazaverde-web/public/robots.txt`; `kazaverde-web/public/sitemap.xml`; app content | production verification; SEO; sitemap; deploy validation; public trust | High | Reattach `kazaverde.com` to the correct Vercel project and re-verify production | keep |
| KazaVerde preview domain class | `*.vercel.app` | no change | technical | `docs/kazaverde_deploy_contract.md` | preview testing; deploy reporting; production-vs-preview checks | Low | Restore prior project naming if preview-domain drift creates confusion | keep |
| Admin public custom domain | none documented | no public custom domain planned | public | deployment docs only; Vercel UI audit required | admin access model; internal routing expectations | Medium | Remove any accidental public-domain assignment from admin project | keep |

## 5. Deployment Docs

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KazaVerde deploy contract doc | `docs/kazaverde_deploy_contract.md` | no file rename; align content only | technical | `docs/kazaverde_deploy_contract.md` | KazaVerde deploy verification; production sign-off; release reporting | Medium | Revert doc-only commit if mapping becomes less clear | keep |
| Monorepo Vercel deploy doc | `docs/04-platform/vercel-deploy.md` | no further file rename planned | technical | `docs/04-platform/vercel-deploy.md` | Vercel setup; root-directory assumptions; deploy workflow | Medium | Revert doc-only commit if workflow becomes ambiguous | keep |
| Admin deploy doc | `arei-admin/DEPLOY.md` | no file rename; align content only | technical | `arei-admin/DEPLOY.md` | admin deployment; root-directory rules; internal ops workflow | Medium | Revert doc-only commit if admin deployment guidance regresses | keep |
| Platform tooling handoff doc | `docs/04-platform/tooling-handoff.md` | no file rename; align content only | technical | `docs/04-platform/tooling-handoff.md` | onboarding; handoff; implementation context | Low | Revert doc-only commit if naming map becomes inconsistent | keep |
| Security baseline doc | `docs/04-platform/security-baseline.md` | no file rename; align content only | technical | `docs/04-platform/security-baseline.md` | security review; deploy assumptions; admin/public boundary | Low | Revert doc-only commit if naming or surface boundaries become unclear | keep |

## 6. Scripts and Config

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Root dev script: admin | `npm run dev --prefix arei-admin` | no change | technical | `package.json` | local development; onboarding; README-style workflows | Low | Restore original script if any later rename breaks local dev | keep |
| Root dev script: KazaVerde | `npm run dev:kaza --prefix kazaverde-web` | no change | technical | `package.json` | local KazaVerde development; onboarding | Low | Restore original script if any later rename breaks local dev | keep |
| Root Vercel build mapping | build from `packages/arei-sdk` into `kazaverde-web/dist` | no change | technical | `vercel.json` | KazaVerde production builds; Vercel root deploy behavior | High | Restore prior `vercel.json` build and output settings | keep |
| KazaVerde local Vercel build mapping | build via `../packages/arei-sdk` and `../../kazaverde-web` | no change | technical | `kazaverde-web/vercel.json` | alternate/root-directory-sensitive deploy behavior | High | Restore prior `kazaverde-web/vercel.json` settings | keep |
| Admin Vercel config | build `npm run build`, output `dist` | no change | technical | `arei-admin/vercel.json` | admin Vercel builds; root-directory contract | High | Restore prior `arei-admin/vercel.json` settings | keep |
| Admin deploy guard script identifier | `check-arei-admin-deploy` and `arei-admin` path assumptions | no change | technical | `scripts/check-arei-admin-deploy.mjs`; docs; package scripts if added later | admin deploy validation; runbooks; CI-style checks | Medium | Restore script path assumptions and docs references | keep |

## 7. Public Naming

| Identifier | Current value | Proposed value | Layer | Where it appears | Downstream dependencies | Risk level | Rollback note | Decision status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parent platform short name | `AREI` | no change | canonical | strategy docs; architecture docs; internal naming model | brand architecture; documentation; endorsement policy | Low | Restore `AREI` as canonical platform name in docs if drift occurs | keep |
| Parent platform full name | `Africa Real Estate Index` | no change | canonical | strategy docs; architecture docs; package description context | canonical platform naming; formal references | Low | Restore full canonical name in docs if drift occurs | keep |
| Internal ops product name | `AREI Admin` | no change | canonical | architecture docs; admin docs; operational references | internal product clarity; admin/public separation | Low | Restore canonical admin naming in docs if drift occurs | keep |
| Cape Verde consumer surface name | `KazaVerde` | no change | canonical | public product copy; strategy docs; deploy docs; domain references | public trust; domain identity; consumer positioning | Medium | Restore `KazaVerde` in public-facing copy and docs if drift occurs | keep |
| Default endorsement language | not standardized yet | `Powered by AREI` | public | future footer/about/trust copy; deployment docs; brand architecture | consumer trust messaging; endorsement consistency; public-brand hygiene | Low | Revert to prior copy if rollout is inconsistent, but keep `Powered by AREI` as approved target | rename later |

## 8. Notes for Execution Planning

- `rename now` should remain unused until the freeze is lifted.
- `AREI SDK` is an internal technical component and must not be treated as a public brand during any rename work.
- `kazaverde-web` and `arei-admin` are currently acceptable as technical identifiers even though the public-facing names are `KazaVerde` and `AREI Admin`.
- Repo and package renames are lower priority than docs alignment and deployment-doc cleanup.
- Domain and public-brand continuity take precedence over technical naming neatness.

## Completion Condition for This Inventory

This inventory is ready for execution planning only when:
- all rows have a reviewed decision status
- deployment docs have been aligned to the approved brand architecture
- the freeze-release gate has been explicitly approved
- any row marked `rename later` has an owner and a dependency sequence in the execution checklist
