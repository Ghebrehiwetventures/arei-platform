# AI Development Guardrails

Last updated: 2026-03-18

## Purpose

This document defines canonical guardrails for using AI tools while working on AREI and KazaVerde.

It is not a general tool-onboarding document. General repo orientation belongs in `docs/04-platform/tooling-handoff.md`.

This file is specifically about how AI-assisted development should behave around security, package choices, claims, and review quality.

## Classification scale

- `launch critical now`
- `important soon`
- `later stage`
- `not currently applicable`

## Guardrails

### 1. Never paste secrets into AI chats

- Classification: `launch critical now`

Rule:
- do not paste service-role keys, database URLs, admin passwords, session secrets, webhook secrets, or production-only env values into AI conversations

Applies now to:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Important nuance:
- publishable browser keys are less sensitive than server secrets, but they still should not be sprayed casually into prompts unless necessary and safe

### 2. Keep security claims grounded in actual repo behavior

- Classification: `launch critical now`

Rule:
- AI must not claim a security property unless it is visible in the repo, documented in canonical docs, or explicitly verified

Examples:
- do not claim mature auth if the repo only has shared-password admin login
- do not claim webhook verification if no webhook receiver exists
- do not claim upload validation if no upload surface exists
- do not claim RLS coverage beyond what has actually been documented or verified

### 3. Verify packages exist before installing

- Classification: `launch critical now`

Rule:
- AI should not invent package names or recommend installing unverified libraries
- before suggesting or adding a package, verify it exists and fits the current architecture

Why it matters here:
- this repo already spans frontend, admin, Supabase, and scraping dependencies
- dependency sprawl creates security and maintenance drag quickly

### 4. Prefer maintained and secure package versions

- Classification: `launch critical now`

Rule:
- prefer packages with current maintenance, active ecosystem use, and a credible update path
- avoid adding abandoned or obscure packages when existing repo-standard libraries already solve the need

AREI-specific implication:
- work with the existing stack first:
  - Supabase client
  - React/Vite
  - existing TypeScript tooling
- do not replace core dependencies casually because an AI model suggested a trendier option

### 5. Use adversarial AI review for security-sensitive changes

- Classification: `important soon`

Rule:
- for security-sensitive code or config changes, ask AI for a hostile review perspective, not just a happy-path implementation review

Useful framing:
- "review this as a security engineer"
- "look for privilege escalation, secret leakage, auth bypass, and unsafe defaults"
- "assume a determined attacker and a careless future maintainer"

### 6. Ask AI to separate current scope from future scope

- Classification: `launch critical now`

Rule:
- AI should distinguish between:
  - current launch product
  - near-term planned surfaces
  - later architecture
  - not currently applicable concerns

Why it matters here:
- KazaVerde is read only
- there are no payments
- there is no current public upload surface
- webhook guidance should not be written as if webhooks already exist

### 7. Do not let AI turn contradictions into fake coherence

- Classification: `launch critical now`

Rule:
- when AI sees conflicts between docs, code, and governance, it should surface them explicitly

Current known examples:
- read-only index doctrine vs `SELL` / `RENT` / `LIST PROPERTY`
- preferred index framing vs aggregator copy
- governance vs broader About-page source/dedup explanations
- trustworthy market-intelligence goal vs approximate trend data

AI must not silently rewrite these contradictions into assumed consensus.

### 8. Do not use AI as the sole authority for security sign-off

- Classification: `launch critical now`

Rule:
- AI can assist with threat review, checklist creation, and code inspection
- AI does not replace direct repo verification, runtime checks, dependency audit results, or deployment verification

AREI-specific implication:
- launch-critical security conclusions should be tied back to repo docs, code paths, and verified environment behavior

### 9. Prefer minimal privilege in AI-proposed architecture

- Classification: `important soon`

Rule:
- when AI proposes backend or auth changes, default to least privilege
- do not casually widen public write access, browser-visible secrets, or permissive roles

Examples:
- prefer insert-only public newsletter policy over broader table exposure
- do not expose service-role credentials to browser clients
- avoid creating broad mutation APIs when narrow server-side checks are enough

### 10. Do not paste production incident data without need

- Classification: `important soon`

Rule:
- avoid sharing raw operational data, user emails, internal logs, or sensitive production traces with AI tools unless necessary and scrubbed

Applies here to:
- subscriber emails
- internal admin logs
- raw database dumps
- production-only error traces containing config details

### 11. Security review prompts should be explicit

- Classification: `important soon`

Rule:
- when requesting AI review, specify the review lens clearly

Good examples:
- review this auth flow as a security engineer
- review this Supabase exposure model for least privilege
- review this change for secret leakage and broken trust boundaries
- review this deploy plan for preview-vs-production confusion

### 12. AI must not overstate vendor-specific guarantees

- Classification: `launch critical now`

Rule:
- keep guidance vendor neutral where possible
- if using vendor capabilities such as Supabase RLS or hosting edge protection, describe the principle first and the vendor feature second

Why it matters:
- the project should remain understandable even if implementation details evolve

### 13. AI-generated code must keep security-sensitive comments honest

- Classification: `important soon`

Rule:
- comments and docs added by AI must reflect what the code actually does today
- do not label a temporary password gate as "secure auth"
- do not label a preview verification as "production verified"

### 14. AI should prefer canonical docs over chat residue

- Classification: `launch critical now`

Rule:
- when strategy, security, or trust questions arise, AI should update canonical docs rather than leaving the answer only in conversation

This is especially important for:
- security baseline changes
- launch checklist updates
- auth model decisions
- exposure/RLS clarifications

## Current repo-specific AI cautions

### C1. Admin auth is easy to misdescribe

- Classification: `launch critical now`

Reality:
- current admin auth is a temporary password gate with a shared secret cookie

Do not let AI describe it as:
- robust auth
- role-based auth
- mature session management

### C2. Supabase exposure is easy to overclaim

- Classification: `launch critical now`

Reality:
- browser clients use publishable keys and public feed access
- newsletter subscribers has insert-only anon policy
- broader RLS/documented exposure coverage still needs clearer canonical documentation

Do not let AI claim:
- all public data surfaces are fully documented and verified

### C3. Security scope is narrower than generic startup advice assumes

- Classification: `launch critical now`

Reality:
- no payments
- no public uploads
- no public account auth
- no canonical webhooks currently active

AI should not flood the repo with irrelevant controls while missing current real issues like admin auth, rate limiting, dependency audit, and secret hygiene.

## Practical review pattern

For any security-sensitive change, use this minimum AI-assisted pattern:

1. Ask AI to inspect the actual code path first.
2. Ask AI to review it as a security engineer.
3. Ask AI what claims are verified versus assumed.
4. Record resulting truth in canonical docs if the change affects policy or launch readiness.
