# Pre-Launch Security Checklist

Last updated: 2026-03-18

## Purpose

This document is the canonical pre-launch security checklist for the current AREI / KazaVerde launch scope.

It is not a generic internet-security checklist. It is tied to:
- KazaVerde as a read-only public product
- `arei-admin` as a small protected admin surface
- Supabase-backed public reads and narrow public writes

## Classification scale

- `launch critical now`
- `important soon`
- `later stage`
- `not currently applicable`

## Checklist

### 1. Remove or gate non-essential console logs

- Classification: `launch critical now`
- Current status: `open`

Why it matters here:
- current frontend and admin code still contain `console.warn`, `console.info`, and `console.error`
- pipeline and operational scripts can keep logs, but public browser surfaces should not leak noisy internal diagnostics in production

What to verify:
- public-facing browser code does not expose unnecessary internal config or operational noise
- admin frontend does not log sensitive operational details to end users

OPEN:
- KazaVerde still logs some connection/init messages in dev-only branches
- Home page and admin data loaders still emit runtime errors to console

### 2. Protect admin endpoints with real access control

- Classification: `launch critical now`
- Current status: `open`

Why it matters here:
- `arei-admin/api/auth.js` is the only explicit auth endpoint in the repo
- it currently relies on one shared password and one shared session secret

What to verify now:
- admin protection is not explicitly disabled in production
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are set in production
- admin is not intentionally left open
- cookie flags remain `HttpOnly`, `Secure`, and `SameSite=Strict`

What remains incomplete:
- no mature per-user auth
- no rate limiting
- no audit trail for auth attempts

Canonical posture:
- until mature auth exists, the admin should be treated as internal-only

### 3. Add rate limits where login or mutation exists

- Classification: `launch critical now` for admin login and newsletter writes
- Current status: `open`

Why it matters here:
- admin login endpoint can be brute-forced
- newsletter subscription path can be spammed or abused

What to verify:
- any server-side login route has practical request throttling
- any future mutation endpoint gets explicit abuse controls

OPEN:
- no explicit rate-limiting layer is documented for `/api/auth`
- newsletter insert path currently depends on database constraints and narrow scope, not explicit abuse throttling

### 4. Password reset throttling

- Classification: `not currently applicable`
- Current status: `not applicable`

Why:
- current product does not expose user accounts or password-reset flows

Future rule:
- if account auth is added, password reset must be throttled and audited

### 5. DDoS and edge protection posture

- Classification: `important soon`
- Current status: `open`

Why it matters here:
- public KazaVerde is internet-facing
- admin login route is public when deployed

What to verify:
- hosting/platform-level protection is enabled where available
- traffic spikes on public read surfaces do not directly expose privileged backends
- admin route does not become an unprotected brute-force target

OPEN:
- no canonical documented DDoS posture exists yet

### 6. Dependency audit status

- Classification: `launch critical now`
- Current status: `open`

Why it matters here:
- the repo depends on browser, admin, Supabase, and scraping packages
- a known-vulnerability pass should happen before launch

What to verify:
- dependency audit has been run on the relevant packages
- critical findings are either fixed or explicitly accepted with rationale

Current gap:
- no documented audit result is committed yet

### 7. Backup and restore testing

- Classification: `important soon`
- Current status: `open`

Why it matters here:
- data trust is central to the project
- operational confidence is weak if restore ability is untested

What to verify:
- database backup posture is known
- restore procedure has been tested at least once on a non-production target
- critical docs and migration history are enough to rebuild expected state

OPEN:
- no canonical restore test result is documented in the repo

### 8. Test webhooks and test integrations must not touch real systems

- Classification: `launch critical now`
- Current status: `open by policy, not currently active in code`

Why it matters here:
- the repo does not currently show a canonical webhook receiver, but future integrations are likely
- preview/test confusion is already a known risk area in deploy flows

What to verify:
- no test integration uses production secrets
- no test event can mutate production systems

Current note:
- this is preventative policy now, because webhook architecture is not yet active

### 9. Secret inventory and rotation check

- Classification: `launch critical now`
- Current status: `open`

What to verify:
- production secret set is known
- secrets are stored in env/hosting secret managers, not repo files
- any long-lived reused secrets are rotated before or at launch

Critical secrets in current scope:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Note:
- public anon/publishable keys are not treated the same as server secrets

### 10. RLS and public data exposure review

- Classification: `launch critical now`
- Current status: `partially closed`

What to verify:
- public browser clients only reach intended read surfaces
- `newsletter_subscribers` remains insert-only for anon
- no browser code uses service-role credentials

Current evidence:
- `newsletter_subscribers` migration enables RLS with anon insert only
- public SDK uses anon/publishable client access

OPEN:
- document complete exposure model for every production view/table used by browser clients

### 11. CORS and origin rules

- Classification: `important soon`
- Current status: `open`

What to verify:
- any future custom API route with cross-origin access has an explicit origin allow-list
- mutation routes do not default to permissive CORS

Current note:
- current architecture has limited custom API surface, so this is more about preventing sloppy expansion than fixing an existing broad misconfiguration

### 12. Redirect allow-list check

- Classification: `important soon`
- Current status: `not currently active`

What to verify:
- if auth confirmations, redirects, or email callback flows are added, they validate destination URLs against an allow-list

Current note:
- no canonical redirect-driven auth flow is documented in the current scope

### 13. Storage bucket and upload review

- Classification: `not currently applicable`
- Current status: `not applicable`

Why:
- the current launch surface does not expose uploads
- controlled storage for display images is a later architecture path, not current launch behavior

Future rule:
- if uploads or bucket-backed assets are introduced, access control and upload validation become mandatory launch items

### 14. Webhook signature verification

- Classification: `not currently applicable`
- Current status: `not applicable`

Why:
- no canonical webhook receiver is present in the current launch architecture

Future rule:
- any webhook must validate signature and separate test from production secrets

### 15. Critical action logging

- Classification: `important soon`
- Current status: `open`

What to verify:
- admin login attempts are traceable
- production-affecting manual actions are traceable
- deploy verification outcomes are traceable

Current note:
- ingest and reporting logs exist
- auth and admin audit logging do not yet exist as a canonical system

### 16. Production separation check

- Classification: `launch critical now`
- Current status: `partially closed`

What to verify:
- production sign-off is based on `https://kazaverde.com`, not preview URLs
- stub/test sources are excluded from public launch data
- no preview/test env points at unintended production effects

Current evidence:
- deploy contract explicitly distinguishes production from `*.vercel.app`
- public feed excludes stub/test sources

## Open security risks

### S1. Admin auth is temporary rather than mature

- Classification: `launch critical now`
- Mitigation:
  keep admin protected in production now; plan migration to proper account-based auth
- Current status: `open`

### S2. No documented rate limiting on admin login

- Classification: `launch critical now`
- Mitigation:
  introduce throttling or equivalent abuse protection on `/api/auth`
- Current status: `open`

### S3. No documented dependency-audit result yet

- Classification: `launch critical now`
- Mitigation:
  run and record dependency audit before launch
- Current status: `open`

### S4. Secret rotation practice is implied but not documented operationally

- Classification: `launch critical now`
- Mitigation:
  document and perform pre-launch rotation for sensitive long-lived secrets
- Current status: `open`

### S5. Restore readiness is not yet documented

- Classification: `important soon`
- Mitigation:
  test and record backup/restore path on a non-production target
- Current status: `open`

## Launch interpretation

For the current product scope, the most important pre-launch security work is not enterprise-feature security theater.

It is:
- protecting the admin properly enough for launch
- tightening secret hygiene and rotation
- documenting public data exposure and RLS clearly
- auditing dependencies
- ensuring preview/test paths do not get mistaken for production truth
