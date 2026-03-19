# Security Baseline

Last updated: 2026-03-18

## Purpose

This document defines the canonical platform security baseline for AREI and KazaVerde.

It covers actual application and infrastructure security expectations for the current repo and current launch scope.

It is separate from AI workflow rules, which belong in `docs/04-platform/ai-development-guardrails.md`.

## Current architecture context

The current security baseline must be read against the actual system:
- public consumer product: `kazaverde-web/`
- public data access: read-heavy access through `packages/arei-sdk/` to `public.v1_feed_cv`
- public newsletter write path: direct insert into `newsletter_subscribers`
- admin surface: `arei-admin/`
- admin auth: simple password gate via `arei-admin/api/auth.js`
- data engine and scripts: `core/` and `scripts/`, often using Supabase env credentials

Current product scope matters:
- public KazaVerde is read only
- no payments
- no user accounts in the public product
- no public file-upload surface identified in the current repo
- no canonical webhook-based product integration identified in the current repo

## Classification scale

- `launch critical now`
- `important soon`
- `later stage`
- `not currently applicable`

## Baseline rules

### 1. Session expiration and token rotation

- Classification: `launch critical now` for admin, `not currently applicable` for public KazaVerde auth

Policy:
- any authenticated admin session must expire on a bounded schedule
- session material must not be a permanent static secret reused indefinitely
- session tokens must be rotatable without code changes

Current repo state:
- admin auth uses a cookie with `Max-Age=86400`
- the cookie value is the raw `ADMIN_SESSION_SECRET`
- there is no server-side session store, no token versioning, and no session invalidation model beyond rotating the secret

Canonical baseline:
- 24-hour admin session lifetime is acceptable as a temporary baseline, not a mature endpoint state
- `ADMIN_SESSION_SECRET` must be long, random, and rotatable
- a mature auth layer should replace direct secret-as-cookie patterns

OPEN:
- there is no canonical session rotation procedure documented yet
- there is no per-session invalidation model

### 2. Mature auth approach

- Classification: `important soon`

Policy:
- public-facing admin surfaces should move toward a mature auth model with individual accounts, revocation, and server-side permission checks
- password-only gatekeeping is acceptable only as a temporary narrow-access control for a small internal surface

Current repo state:
- `arei-admin` uses one shared password and one shared session secret
- outside local development, the admin is now protected by default unless `VITE_ADMIN_PROTECTED=false` is set explicitly

Canonical baseline:
- until a mature auth model exists, the admin should be treated as strictly internal
- production admin must not be intentionally left open
- the current admin password gate is a temporary access-control measure, not the desired long-term model
- mature auth should include:
  - named identities
  - revocable sessions
  - auditable actions
  - role-aware server-side checks

OPEN:
- no mature auth provider or architecture is chosen yet

### 3. Secret handling and env hygiene

- Classification: `launch critical now`

Policy:
- service-role credentials, admin secrets, database URLs, and signing secrets must exist only in local env files or hosting-provider secret stores
- public publishable keys may appear in client env examples only when they are intended for browser use
- no secret may be pasted into docs, chat logs, issue comments, or AI prompts

Current repo state:
- root `.gitignore` ignores `.env` and `.env.local`
- `kazaverde-web/.env.example` contains public browser-facing Supabase values
- `core/supabaseClient.ts` can use `SUPABASE_SERVICE_ROLE_KEY`
- admin deploy docs require `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`

Canonical baseline:
- public anon/publishable keys are acceptable in client env examples
- service-role keys and admin secrets must never appear in committed examples
- `.env.example` files must contain only values safe for their execution context

OPEN:
- verify that no additional subprojects require their own ignored env patterns

### 4. `.gitignore` expectations

- Classification: `launch critical now`

Policy:
- `.env`, `.env.local`, local artifacts, and deploy metadata must be ignored
- if a subproject introduces additional secret-bearing local files, `.gitignore` must be updated immediately

Current repo state:
- `.env`, `.env.local`, `.vercel`, `artifacts/`, `dist/`, and `node_modules/` are ignored

Canonical baseline:
- current root ignore rules are a minimum baseline, not a final one
- any new secret-bearing file must be ignored before it is used

TODO:
- verify whether additional local auth or Supabase CLI files should be ignored explicitly beyond current coverage

### 5. Secret rotation policy

- Classification: `launch critical now`

Policy:
- these secrets must be rotatable without code edits:
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - any future webhook signing secret

Canonical minimum:
- rotate immediately after suspected leakage
- rotate before or at launch if a secret has been reused across long experimentation periods
- rotate admin secrets whenever access changes materially

OPEN:
- no repo-level documented cadence exists yet for routine rotation

### 6. Package verification and dependency audit policy

- Classification: `launch critical now`

Policy:
- do not install packages that have not been verified to exist, be maintained, and fit the current architecture
- production dependencies should be audited for known vulnerabilities before launch and after material dependency changes
- avoid dependency sprawl for small conveniences

Current repo state:
- the repo depends heavily on `@supabase/supabase-js`, Vite, React, Puppeteer, and scraping-related libraries
- there is no canonical security-audit doc yet

Canonical baseline:
- verify package identity before install
- prefer well-maintained packages already aligned with existing architecture
- run dependency audit before launch and record outcome in the pre-launch checklist

### 7. Input sanitization and parameterized queries

- Classification: `launch critical now`

Policy:
- any server-side SQL must use parameterized queries or safe client-library abstractions
- user-controlled input must be normalized and constrained before use
- any HTML rendered from listing content must be sanitized before display

Current repo state:
- Supabase client query builders are used rather than hand-written SQL in most app paths
- `sanitize-html` exists as a dependency
- public newsletter writes pass user email into Supabase insert logic

Canonical baseline:
- continue using typed or parameterized query APIs
- sanitize any listing HTML or rich text before rendering in the browser
- validate newsletter email input beyond naive trim/lowercase if stricter abuse controls are needed

OPEN:
- confirm where `description_html` is rendered and that sanitization is consistently applied there

### 8. Row Level Security

- Classification: `launch critical now`

Policy:
- any public table reachable by anon browser clients must use explicit RLS or equally strict access controls
- public writes must be narrow and table-specific
- server-side write paths using service role must not leak into browser code

Current repo state:
- `newsletter_subscribers` enables RLS and has an `anon_insert_only` policy
- public KazaVerde uses anon/publishable client access through `v1_feed_cv`
- data engine scripts can bypass RLS with service-role credentials

Canonical baseline:
- keep public consumer access constrained to intended feed/view surfaces
- keep public write permission limited to the narrowest required tables
- document RLS status for every anon-accessible table or view used in production

OPEN:
- explicit RLS/view policy status for all public read surfaces is not yet documented in one place

### 9. Strict CORS

- Classification: `important soon`

Policy:
- any server-side endpoint, edge function, or webhook receiver must use an explicit origin allow-list where browser cross-origin access is needed
- avoid permissive `*` defaults on mutation endpoints

Current repo state:
- no broad custom API layer is evident beyond `arei-admin/api/auth.js`
- current admin auth route appears same-origin and does not define CORS behavior explicitly

Canonical baseline:
- if additional API routes are introduced, define allowed origins explicitly
- do not add cross-origin mutation endpoints without a documented allow-list

### 10. Redirect allow-list validation

- Classification: `important soon`

Policy:
- if login, logout, magic-link, email confirmation, or webhook callbacks introduce redirects, they must validate destinations against an allow-list

Current repo state:
- no canonical redirect-based auth or callback flow is documented yet

Canonical baseline:
- do not ship arbitrary redirect parameters
- any future redirect-capable flow must use an explicit allow-list

### 11. Server-side permission checks

- Classification: `launch critical now` for admin and future mutations, `not currently applicable` for most public read-only pages

Policy:
- permissions must be enforced server-side, not only hidden in the UI
- any mutation path, admin data path, or privileged export must check authority on the server

Current repo state:
- admin protection is checked in `/api/auth`
- public KazaVerde mostly reads public data
- there is no mature role model yet

Canonical baseline:
- server-side checks remain mandatory wherever privilege exists
- UI hiding alone is never a permission model

OPEN:
- current admin auth gate is too coarse for long-term server-side permission design

### 12. Storage bucket access control

- Classification: `later stage`

Policy:
- any future object storage used for display images, reports, or uploads must define:
  - public vs private bucket intent
  - signed vs unsigned access rules
  - retention expectations
  - write restrictions by actor

Current repo state:
- no canonical Supabase Storage bucket architecture is documented in the repo yet
- public image browsing currently depends largely on third-party source URLs

Canonical baseline:
- if AREI moves to controlled image hosting, access control rules must be documented before launch of that path

### 13. Upload validation by size and file signature

- Classification: `not currently applicable`

Current repo state:
- no public upload surface is identified in the current launch product

Future baseline:
- if uploads are added later, validate both file size and actual file signature
- do not trust file extension or MIME header alone

### 14. Webhook signature verification

- Classification: `not currently applicable`

Current repo state:
- no canonical webhook receiver is identified in the repo

Future baseline:
- any webhook must verify signature before processing
- test and production secrets must be separate

### 15. Critical action logging

- Classification: `important soon`

Policy:
- critical admin or operational actions should produce auditable records

Examples:
- admin login success/failure
- secret rotation events
- schema or policy changes
- manual backfill actions that change public-facing data
- production deploy verification outcomes

Current repo state:
- the repo has operational logs and reports for ingest
- there is no canonical audit log for admin auth or admin actions

Canonical baseline:
- production-affecting operations should become traceable
- logging must avoid secret leakage

### 16. Test vs production separation

- Classification: `launch critical now`

Policy:
- production data, test data, preview deployments, and local environments must remain distinguishable
- no test webhook, preview env, or stub source should affect production truth

Current repo state:
- `cv_source_1` and `cv_source_2` are excluded from the public feed
- `*.vercel.app` is explicitly not production truth for KazaVerde
- admin and product deploy docs distinguish production from preview

Canonical baseline:
- keep preview/test domains out of production sign-off
- keep stub/test data out of public launch surfaces
- do not point test integrations at production side effects

## Current security posture summary

### Strong enough for current scope

- public KazaVerde is mostly read only
- consumer access uses publishable Supabase keys, not service-role keys
- newsletter subscribers table has explicit insert-only RLS for anon
- admin cookie uses `HttpOnly`, `Secure`, and `SameSite=Strict`
- admin now fails closed in production unless protection is explicitly disabled
- production-vs-preview distinction is documented

### Weak or incomplete for current scope

- admin auth is temporary and not mature
- admin session uses the raw shared secret as cookie value
- no documented routine secret rotation policy exists
- no canonical dependency audit record exists yet
- no canonical security checklist existed before this track
- admin should still be treated as an internal surface rather than a broadly exposed public tool

### Not yet relevant because the product does not currently expose it

- payments
- public uploads
- webhook receivers
- user password-reset flows in the public consumer app
- broad cross-origin custom API surface
