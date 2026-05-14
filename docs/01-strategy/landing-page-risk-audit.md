# Landing Page Risk Audit — Phase 6
**Date:** 2026-05-14
**Scope:** `arei-landing/index.html` only
**Purpose:** Alignment risk check before external exposure. Not a rewrite.

---

## Summary Verdict

The page is **externally safe for current investor outreach.** No wrong domains. No KazaVerde brand leak to users. Hero and footer use canonical language verbatim. The data-vs-portal distinction is explicitly anchored in the copy. All identified portal/lead-gen wording has been resolved with minimal changes.

---

## Fixes Applied

### Fix 1 — Tagline punctuation
**"Three surfaces, one engine." → "Three surfaces. One engine."**
Surfaces section H2. Comma replaced with period; "one" capitalised. Canonical form now applied.

### Fix 2 — "leads" in Broker Tools surface card
**`leads` → `index visibility`**
Includes field, card 02: `Listing submission, AI validation, leads, benchmark`
→ `Listing submission, AI validation, index visibility, benchmark`

"Leads" implied AREI routes buyer inquiries to brokers (portal behavior). "Index visibility" correctly describes the byproduct brokers receive from having their listings in the index — without implying AREI is a buyer-broker conduit.

### Fix 3 — Broker CTA portal framing
**"receive international visibility for your listings" → data contribution framing**
`Join the index surface and receive international visibility for your listings.`
→ `Participate in the broker data pilot and help improve Cape Verde market coverage.`

Original copy led with broker exposure as the value proposition, which is portal positioning. New copy leads with data contribution, which is consistent with the infrastructure thesis.

---

## Remaining Risks

### R3 — "confidence scoring" in Intelligence Layer `[LOW — monitor]`
**Location:** Surfaces section, card 03, Includes field
**Text:** `Screener, confidence scoring, briefings, API, dashboards`

Confidence scoring is a methodology-dependent claim. Acceptable now because the Intelligence Layer is described as a future paid surface, not a live product. Monitor as methodology v1.0 work progresses.

---

### R4 — CSS comment references KazaVerde as source of truth `[VERY LOW — internal only]`
**Location:** `<style>` block, lines 30–36
**Text:** `Sage values mirror KazaVerde. Source of truth: kazaverde-web/src/styles/globals.css`

Not user-visible. Internal developer note. Update when brand token system is centralised (planned in audit PR sequence).

---

## Items Verified Clean

| Check | Status |
|---|---|
| Domain — canonical and OG use `africarealestateindex.com` | ✓ Correct |
| KazaVerde brand name visible to users | ✗ None found |
| `kazaverde.com` links (Cape Verde index CTAs and footer) | ✓ Appropriate — it IS the Cape Verde index |
| Hero H1 — canonical tagline | ✓ Verbatim |
| Footer descriptor | ✓ Verbatim: "Data acquisition and intelligence infrastructure for African property markets." |
| OG / Twitter meta description | ✓ Uses canonical tagline + "Starting with Cape Verde." |
| "We don't sell properties" stated explicitly | ✓ Present (Engine section H2) |
| "Not transaction prices or valuations" disclaimer | ✓ Present (Proof section, below header) |
| Claims of owning listings | ✗ None found |
| Transaction-price or valuation claims | ✗ None found |
| Broker-as-intermediary language | ✗ None found in hero or primary copy |
| "leads" / portal lead-gen language | ✓ Fixed (Fix 2) |
| Broker CTA portal framing | ✓ Fixed (Fix 3) |
| High-saturation colors (magenta, electric blue, lime) | ✗ None — palette is ink/paper/sage only |
| "Three surfaces. One engine." — canonical form | ✓ Fixed (Fix 1) |

---

## Items Deliberately Not Changed

- Hero sub: "We turn fragmented public property listings into structured market data for emerging markets." — accurate; "public property listings" signals source type, not ownership.
- Broker Tools surface card structure and copy otherwise intact — the surface itself is appropriate to show investors the three-surface model.
- OG description appending "Starting with Cape Verde." — contextually appropriate for meta, not in conflict with canonical tagline.
- All `kazaverde.com` / `www.kazaverde.com` links — correct; these are the Cape Verde index, not a brand leak.
- Founder quote ("turns fragmented listings into investable market signal") — accurate infrastructure framing.
- Broker Tools card "Role" field: "Data acquisition. Brokers get international reach." — "international reach" is a softer claim than "visibility for your listings" and describes a structural outcome of being in the index, not a portal promise. Left as-is.

---

## External Safety Assessment

**Safe for investor outreach at current stage.** All portal and lead-gen language resolved. The data-infrastructure framing is consistent across hero, engine, surfaces, founder quote, and footer. No section implies AREI owns listings, transacts, brokers, or generates buyer leads.

R3 (confidence scoring) and R4 (CSS comment) carry no external risk at this stage and require no action before investor outreach.
