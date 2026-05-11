# KazaVerde → Cape Verde Real Estate Index: Brand Migration Plan

**Status:** Plan only — no implementation has occurred.
**Date:** 2026-05-11
**Author:** AREI Platform

---

## Eloy Note

This is a careful brand and SEO migration, not a codebase rename. The public name the product presents to visitors, buyers, brokers, and press is changing from KazaVerde to Cape Verde Real Estate Index. Existing URLs, listing routes, data pipelines, and deployment infrastructure must remain completely stable throughout. Public copy and brand surfaces change first. Technical identifiers change last — or never.

---

## 1. Brand Architecture (Target State)

| Layer | Identity | Notes |
|-------|----------|-------|
| Master brand | AREI — Africa Real Estate Index | Methodology owner, infrastructure layer |
| Public market identity | Cape Verde Real Estate Index | Consumer-facing name for the Cape Verde product |
| Shorthand / ticker | CVREI | Internal shorthand only, not the consumer brand |
| Legacy / transitional | KazaVerde | Retained in technical identifiers; legacy brand context only |
| Endorsement line | "Published by AREI" / "Powered by AREI" | Appears under the Cape Verde Real Estate Index name |

---

## 2. Current State Audit

References discovered by category. File paths and line numbers are reference points for implementation PRs; do not treat this as a rename list.

### 2.1 Visible UI Copy

| Location | File | Detail |
|----------|------|--------|
| Navbar brand text | `kazaverde-web/src/components/Navbar.tsx:39` | "KazaVerde" |
| Footer logo link | `kazaverde-web/src/components/Footer.tsx:14` | "KAZAVERDE" |
| Footer tagline | `kazaverde-web/src/components/Footer.tsx:16` | "A read-only index of public property listings across Cape Verde." |
| Footer contact | `kazaverde-web/src/components/Footer.tsx:43-45` | info@kazaverde.com, Instagram, X handles |

### 2.2 Page Titles and Meta Descriptions

All page titles are derived from the `SITE_NAME` constant.

| Location | File | Current value |
|----------|------|---------------|
| SITE_NAME constant | `kazaverde-web/src/hooks/useDocumentMeta.ts:6` | "KazaVerde" |
| SITE_DESCRIPTION | `kazaverde-web/src/hooks/useDocumentMeta.ts:5` | "Cape Verde's read-only property index…" |
| Home title | `kazaverde-web/src/pages/Home.tsx:76` | "KazaVerde — Cape Verde Real Estate" |
| Landing title | `kazaverde-web/src/pages/Landing.tsx:159-160` | "KazaVerde — Cape Verde Real Estate" |
| Market title | `kazaverde-web/src/pages/Market.tsx:241` | "Market Data — KazaVerde" |
| About title | `kazaverde-web/src/pages/About.tsx:104` | "About AREI / KazaVerde — KazaVerde" |
| Blog list title | `kazaverde-web/src/pages/BlogList.tsx:38` | "Guides — KazaVerde" |
| Saved title | `kazaverde-web/src/pages/Saved.tsx:55` | "Shortlist — KazaVerde" |
| Privacy title | `kazaverde-web/src/pages/Privacy.tsx:9` | "Privacy Policy — KazaVerde" |
| Cookie policy title | `kazaverde-web/src/pages/CookiePolicy.tsx:50` | "Cookie Policy — KazaVerde" |

### 2.3 Open Graph / Twitter Card Metadata

Currently generated via `useDocumentMeta()` hook using `SITE_NAME`. No separate OG-specific component found; updating the hook covers all pages.

### 2.4 JSON-LD Structured Data

Two schemas are hardcoded with KazaVerde brand values.

| Location | File | Fields affected |
|----------|------|----------------|
| Organization schema | `kazaverde-web/src/pages/Home.tsx:61-76` | `name`, `@id`, `url`, `description` |
| Organization schema (duplicate) | `kazaverde-web/src/pages/Landing.tsx:175-185` | Same fields |
| WebSite schema | `kazaverde-web/src/pages/Home.tsx` | `name`, `url` |

These reference `https://kazaverde.com` as the canonical URL. The `@id` and `url` values must not change until a domain migration decision is made; only the `name` and `description` fields are safe to update in Phase 2.

### 2.5 Sitemap / Robots

| File | Detail |
|------|--------|
| `kazaverde-web/public/robots.txt:4` | `Sitemap: https://kazaverde.com/sitemap.xml` — domain-bound, do not change yet |

### 2.6 Routes and Domains

| Reference | Location | Notes |
|-----------|----------|-------|
| Primary domain | `kazaverde-web/vercel.json:2-11` | kazaverde.com — do not change |
| www redirect | `kazaverde-web/vercel.json:5-11` | www.kazaverde.com → kazaverde.com |
| Root build | `/vercel.json:3` | outputDirectory: kazaverde-web/dist — do not change |
| Legacy island routes | `kazaverde-web/vercel.json:13-21` | /listings/sal → /?island=Sal etc. — do not change |
| Social links in footer | `Footer.tsx:43-45` | instagram.com/kazaverde.cv, x.com/kazaverdecv — owner decision needed |

### 2.7 Internal Package and Folder Names

These are technical identifiers. They are explicitly **not** part of this migration.

| Identifier | Location |
|------------|----------|
| `kazaverde-web/` | Folder name — do not rename |
| `"name": "kazaverde-web"` | `kazaverde-web/package.json:2` |
| `"dev:kaza"` script | `/package.json:8` |
| Vercel project name | Deployment config |

### 2.8 CSS Tokens

The `--kv-*` token suite in `kazaverde-web/src/styles/globals.css` is the single source of truth for the product design system (100+ tokens). These are referenced throughout all component files.

**Do not rename any `--kv-*` tokens.** The prefix is an internal technical identifier and does not appear in the public UI.

Key tokens for reference:
- `--kv-green: #8ecfbf` — primary brand accent
- `--kv-green-deep: #2d4a42` — editorial dark
- `--kv-mono`, `--kv-sans` — typography system

### 2.9 Analytics / Event Tracking

| Reference | File | Notes |
|-----------|------|-------|
| GA4 script element id | `kazaverde-web/src/components/GoogleAnalytics.tsx:5` | `kv-ga4-script` — internal DOM id, safe to leave |
| GA4 Measurement ID | Environment variable `VITE_GA4_MEASUREMENT_ID` | Do not change; update GSC property display name separately |
| Formspree subject line | `kazaverde-web/src/lib/formspree.ts:17` | `KazaVerde: ${source} — ${email}` — low visibility, Phase 3 |

### 2.10 Blog Content

`kazaverde-web/src/lib/blog-data.ts` contains 20+ references to "KazaVerde" in:
- Blog post titles and descriptions (visible to users)
- Embedded article body HTML including self-referential links to kazaverde.com

Article titles are consumer-visible. Article body links are SEO-critical (do not alter hrefs). Text-only mentions of "KazaVerde" in article bodies can be updated in Phase 2, but link targets must not change.

### 2.11 Legal Pages

| File | References |
|------|------------|
| `kazaverde-web/src/pages/Privacy.tsx` | "KazaVerde" in body copy, `mailto:info@kazaverde.com` |
| `kazaverde-web/src/pages/CookiePolicy.tsx` | Same pattern |

Legal entity naming requires a considered decision — the email address `info@kazaverde.com` may need to remain functional regardless of what text surrounds it.

### 2.12 Contact Email

`info@kazaverde.com` appears in Footer, Privacy, CookiePolicy, and Formspree subjects. This is a live operational address. Any display-name change is safe; the address itself is an owner decision.

### 2.13 Landing Page (`arei-landing/index.html`)

Multiple references to `https://www.kazaverde.com` and `https://kazaverde.com` in external CTA links. These are deliberate outbound links to the product — do not change href values. Visible link text may be updated.

### 2.14 Documentation (37+ files)

Strategic and operational docs reference KazaVerde extensively. Key files:
- `docs/kazaverde_release_rules.md`
- `docs/kazaverde_deploy_contract.md`
- `docs/06-go-to-market/brand-architecture.md`
- `docs/06-go-to-market/kazaverde-content-brain-spec.md`
- `docs/04-platform/visual-identity.md`

Docs can be updated independently of the product; they do not affect public SEO. They are Phase 6.

### 2.15 Admin / Internal Tools

- `arei-admin/PropertyChatLab.tsx:257` — KazaVerde reference in an internal AI lab context. Not customer-facing. Phase 6 or never.

---

## 3. Target State

### Public surfaces (after migration complete)

| Surface | Before | After |
|---------|--------|-------|
| Product name | KazaVerde | Cape Verde Real Estate Index |
| Endorsement | — | Published by AREI |
| Page title template | `{Page} — KazaVerde` | `{Page} — Cape Verde Real Estate Index` |
| Footer logo | KAZAVERDE | CAPE VERDE REAL ESTATE INDEX |
| Navbar brand | KazaVerde | Cape Verde Real Estate Index (or abbreviated form) |
| JSON-LD name field | KazaVerde | Cape Verde Real Estate Index |
| JSON-LD description | Independent property index for Cape Verde | Cape Verde's independent real estate index, published by AREI |
| SITE_NAME constant | "KazaVerde" | "Cape Verde Real Estate Index" |
| Blog post titles | "…KazaVerde index…" | "…Cape Verde Real Estate Index…" |
| About page | "About AREI / KazaVerde" | "About Cape Verde Real Estate Index" |

### Technical identifiers (unchanged)

`kazaverde-web/`, `--kv-*` tokens, `kazaverde.com` domain, `info@kazaverde.com`, Vercel project name, package.json name, analytics event names, database objects, env vars, deployment config, robots.txt, sitemap URL, legacy route redirects.

---

## 4. Migration Principles

1. **Visible brand first.** Change what users see before anything else.
2. **SEO and domain second.** Only after visible copy is stable and crawled.
3. **Technical renames last or never.** Folder names, CSS tokens, package names, and database objects carry no public brand value and carry high breakage risk.
4. **Preserve all existing URLs.** Every indexed URL, listing link, broker link, and social share must continue to resolve correctly throughout the migration.
5. **One surface at a time.** Each PR targets a specific surface category, not a broad find-replace.

---

## 5. Risk Areas

### 5.1 Broken Listing URLs
**Risk:** HIGH if any route rename occurs.
Listing URLs (e.g., `/listing/123`) are shared by brokers and investors and may appear in external systems, CRMs, and printed materials. No route changes should occur during this migration.

### 5.2 Lost SEO Equity
**Risk:** HIGH if canonical domain changes without proper redirect chain.
kazaverde.com has indexed pages, backlinks, and SERP positions. Moving to a new domain without 301 redirects and canonical tag updates would reset search equity. Domain migration is Phase 4 and requires deliberate SEO strategy.

### 5.3 Duplicate Indexed Domains
**Risk:** MEDIUM once a new domain is introduced.
If `capeverterealestate.com` or similar is ever served alongside `kazaverde.com` without canonical tags, Google may index both and dilute authority. All new domains must immediately set `rel=canonical` pointing to the authoritative domain.

### 5.4 Wrong Canonical Tags
**Risk:** MEDIUM.
The JSON-LD `@id` and `url` fields, and any explicit canonical `<link>` tags, must reflect the authoritative domain at every phase. Updating the display name without updating canonicals is safe; updating canonicals to a domain that doesn't yet receive traffic is not.

### 5.5 Stale Social Previews
**Risk:** LOW-MEDIUM.
Open Graph tags cached by LinkedIn, Slack, iMessage, WhatsApp, and Facebook. Cache TTL varies by platform (hours to weeks). After Phase 2, old shares will continue showing KazaVerde branding until the cache expires or the URL is re-scraped. This is acceptable — do not try to purge manually at scale.

### 5.6 Old Broker / Investor Links
**Risk:** HIGH if routes or domains change before redirects are in place.
Broker and investor partners may have bookmarked or embedded links to specific listing or market URLs. Phase 5 (redirects) must be complete before any domain change.

### 5.7 Analytics Continuity
**Risk:** MEDIUM.
The GA4 property is tied to the kazaverde.com domain. If a domain migration occurs, a new data stream may need to be added to the same GA4 property (not a new property) to preserve historical data. Event names, funnels, and goals do not need to change.

### 5.8 Internal Code Breakage from Broad Rename
**Risk:** HIGH if broad find-replace is attempted.
`--kv-*` tokens are referenced in hundreds of component files. `kazaverde-web` is the build target in vercel.json. Renaming either without complete dependency mapping would break the build or visual output silently.

---

## 6. Phased Migration

### Phase 0 — Plan (current)
- This document exists and is reviewed.
- No implementation.
- Owner confirms brand decisions (primary domain, email address, social handle continuity).

### Phase 1 — Visible Copy Audit PR
- Confirm exact strings to replace in each Phase 2 file.
- Agree on the canonical form of the new name in all contexts:
  - Full: "Cape Verde Real Estate Index"
  - Short: "CVREI" (internal) or abbreviated display form for tight nav contexts
  - Endorsement: "Published by AREI"
- Agree on Footer brand block treatment (logo style, tagline, social links).
- No code changes.

### Phase 2 — Public Copy Update (first implementation PR)
**Scope:** Visible text only. No route, domain, URL, token, or technical identifier changes.

Files in scope:
- `kazaverde-web/src/hooks/useDocumentMeta.ts` — update SITE_NAME and SITE_DESCRIPTION
- `kazaverde-web/src/components/Navbar.tsx:39` — brand text
- `kazaverde-web/src/components/Footer.tsx` — logo text, tagline (not email/social hrefs unless decided)
- `kazaverde-web/src/pages/About.tsx` — title and body copy
- `kazaverde-web/src/pages/Market.tsx` — page title
- `kazaverde-web/src/pages/BlogList.tsx` — page title
- `kazaverde-web/src/pages/Saved.tsx` — page title
- `kazaverde-web/src/lib/blog-data.ts` — visible blog titles and description text (not href values)
- `kazaverde-web/src/pages/Home.tsx` — JSON-LD `name` and `description` fields only (not `@id`, not `url`)
- `kazaverde-web/src/pages/Landing.tsx` — same JSON-LD fields + visible title copy
- Legal pages (`Privacy.tsx`, `CookiePolicy.tsx`) — body copy references (not email address unless decided)

**What this PR must not touch:**
- Any `href`, `src`, route path, or URL string
- JSON-LD `@id` or `url` fields
- robots.txt
- vercel.json
- CSS tokens
- Package names
- Env vars
- Analytics configuration

### Phase 3 — Metadata / SEO Update
- Update Open Graph `og:site_name` and `og:title` templates.
- Update Twitter card `twitter:title`.
- Update JSON-LD `description` and `name` fields site-wide (already done in Phase 2 for Home and Landing; audit remaining pages).
- Update Formspree subject line.
- Update AREI landing page visible link text (not hrefs).
- Submit updated sitemap to Google Search Console after deploy.

### Phase 4 — Domain / Canonical Decision
**Owner decision required before this phase begins.**
- Decide whether the product migrates to a new domain (e.g., `capeverterealestate.com`) or retains `kazaverde.com` with updated branding.
- If retaining `kazaverde.com`: no changes needed in Phase 4.
- If migrating domain: plan redirect strategy, update canonical `<link>` tags, update JSON-LD `@id` and `url`, update robots.txt sitemap URL.
- Do not execute Phase 4 without Phase 5 redirects ready to deploy simultaneously.

### Phase 5 — Redirect Implementation
Only needed if domain migration is chosen in Phase 4.
- Implement 301 redirects from old domain to new domain for all URL patterns.
- Verify redirect chains for listing URLs, market URLs, blog URLs.
- Test with broker/investor sample links before switching DNS.
- Deploy redirects and domain change atomically.

### Phase 6 — Google Search Console / Analytics Update
After Phase 3 (and Phase 5 if domain migration):
- Add new domain as a property in Google Search Console.
- Submit updated sitemap.
- Monitor crawl coverage and index status for 4–6 weeks.
- Update GA4 data stream if domain changed (add new stream to same property, do not create a new property).
- Update social media profile names and bios (instagram.com/kazaverde.cv, x.com/kazaverdecv) — owner decision on handle changes.
- Update docs: `docs/kazaverde_release_rules.md`, `docs/kazaverde_deploy_contract.md`, and go-to-market docs.

### Phase 7 — Optional Technical Cleanup (later, if ever)
These should only happen after all public-facing migration phases are stable and verified, and only if there is a clear operational reason.

- Rename `kazaverde-web/` folder (requires updating all build scripts, CI, vercel.json, package.json, monorepo root scripts — high risk)
- Rename `--kv-*` CSS tokens (requires global find-replace across all components — high risk)
- Rename Vercel project
- Rename Supabase schema objects
- Rename analytics event names
- Archive or rename docs files

---

## 7. Do Not Touch Yet

The following identifiers must **not** be renamed or modified during Phases 1–6.

| Identifier | Reason |
|------------|--------|
| `kazaverde-web/` folder | Build target in vercel.json, scripts, and CI |
| `kazaverde-web` package name | npm dependency resolution |
| `--kv-*` CSS tokens | Referenced in hundreds of component files; no public visibility |
| `kazaverde.com` domain | Primary indexed domain; all SEO equity |
| `info@kazaverde.com` | Live operational email; owner decision required |
| All listing route patterns | Broker/investor links depend on these |
| `vercel.json` (both root and kazaverde-web) | Active deployment config |
| `VITE_GA4_MEASUREMENT_ID` env var | Live analytics measurement |
| `kv-ga4-script` DOM id | Internal; no public visibility |
| All database tables, views, functions | Supabase schema; no public visibility |
| All Supabase source IDs | Data pipeline integrity |
| Analytics event names | Historical data continuity in GA4 |
| `robots.txt` sitemap URL | Domain-bound; change only with domain migration |
| JSON-LD `@id` and `url` fields | Must match canonical domain; change only in Phase 4 |
| Legacy route redirects in vercel.json | Existing SEO/UX redirects |

---

## 8. First Safe Implementation PR

**PR title:** `brand(kazaverde-web): rename visible copy to Cape Verde Real Estate Index`

**Scope:** Public-visible copy only. No routes. No domains. No tokens. No technical identifiers.

**Files to change:**
1. `kazaverde-web/src/hooks/useDocumentMeta.ts` — `SITE_NAME` and `SITE_DESCRIPTION`
2. `kazaverde-web/src/components/Navbar.tsx` — brand text string
3. `kazaverde-web/src/components/Footer.tsx` — logo text and tagline (links TBD by owner)
4. `kazaverde-web/src/pages/About.tsx` — title tag and heading copy
5. `kazaverde-web/src/pages/Market.tsx` — page title
6. `kazaverde-web/src/pages/BlogList.tsx` — page title
7. `kazaverde-web/src/pages/Saved.tsx` — page title
8. `kazaverde-web/src/pages/Privacy.tsx` — body copy "KazaVerde" text (not email address)
9. `kazaverde-web/src/pages/CookiePolicy.tsx` — body copy "KazaVerde" text (not email address)
10. `kazaverde-web/src/pages/Home.tsx` — JSON-LD `name` and `description` only
11. `kazaverde-web/src/pages/Landing.tsx` — JSON-LD `name` and `description` only; visible title copy
12. `kazaverde-web/src/lib/blog-data.ts` — visible titles and descriptions only (not link hrefs)

**Must not change in this PR:**
- Any href, src, or URL value
- JSON-LD `@id` or `url` values
- robots.txt
- vercel.json (either file)
- globals.css / CSS tokens
- package.json
- Environment variables
- Analytics configuration

**Verification checklist before merging:**
- [ ] All page titles render correctly in browser
- [ ] No broken links introduced (run link checker)
- [ ] JSON-LD validates correctly (Google Rich Results Test)
- [ ] Open Graph preview renders correctly (use social debugger tools)
- [ ] No visual regressions in nav/footer
- [ ] Build passes with no TypeScript errors

---

## 9. Recommended PR Sequence

| # | PR | Phase | Risk |
|---|----|----|------|
| 1 | `brand(kazaverde-web): rename visible copy to Cape Verde Real Estate Index` | 2 | Low |
| 2 | `brand(kazaverde-web): update OG, Twitter card, and Formspree metadata` | 3 | Low |
| 3 | `brand(arei-landing): update Cape Verde link text in AREI landing page` | 3 | Low |
| 4 | `brand(docs): update go-to-market and brand architecture docs` | 6 | None |
| 5 | Domain migration PRs (if chosen) | 4–5 | High — plan separately |

---

## 10. Risk Checklist

Use this before each implementation PR.

- [ ] No `href` or `src` values changed
- [ ] No route strings changed
- [ ] No `vercel.json` files changed
- [ ] No CSS token names changed
- [ ] No package.json `name` changed
- [ ] No database objects referenced
- [ ] No env var names changed
- [ ] JSON-LD `@id` and `url` unchanged
- [ ] robots.txt unchanged
- [ ] Build passes locally before opening PR
- [ ] Canonical domain still resolves after deploy
- [ ] No existing indexed URLs return 404 after deploy
- [ ] Google Search Console monitored after Phase 3 deploy
