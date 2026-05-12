# Phase 2: Visible Copy — PR Checklist

**Scope:** Public-visible brand text only.
**Not in scope:** routes, URLs, canonical tags, OG/meta tags, CSS tokens, folder names, env vars, email addresses, social handles, JSON-LD `@id`/`url` fields.

---

## Pre-implementation note

`useDocumentMeta()` in `src/hooks/useDocumentMeta.ts` appends `SITE_NAME` to every page title via this logic (line 46):

```ts
const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
```

Changing `SITE_NAME` cascades automatically to every page that does **not** hardcode "KazaVerde" in the title string it passes. Two pages pass hardcoded titles containing "KazaVerde" — those need explicit updates as well (marked below).

**Also:** The footer already has `Powered by Africa Real Estate Index ↗` with a live AREI link at `Footer.tsx:52–60`. The endorsement exists. Phase 2 updates the logo text above it; it does not add a new endorsement block.

---

## Files to edit

### 1. `kazaverde-web/src/hooks/useDocumentMeta.ts`

| Line | Current | Change to |
|------|---------|-----------|
| 6 | `const SITE_NAME = "KazaVerde";` | `const SITE_NAME = "Cape Verde Real Estate Index";` |

Effect: all page `<title>` tags and `og:title` / `twitter:title` that rely on the suffix will update automatically. **Do not touch** `SITE_TAGLINE`, `SITE_URL`, `DEFAULT_DESCRIPTION`, `DEFAULT_OG_IMAGE`, `setCanonical`, or any `og:*` / `twitter:*` property values here.

---

### 2. `kazaverde-web/src/components/Navbar.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 39 | `KazaVerde` (logo `<a>` text) | `Cape Verde Real Estate Index` |

No other changes in this file. Do not touch routes, class names, or CSS references.

---

### 3. `kazaverde-web/src/components/Footer.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 14 | `KAZAVERDE` (f-logo link text) | `CAPE VERDE REAL ESTATE INDEX` |
| 16 | `A read-only index of public property listings across Cape Verde. We aggregate from local agents, clean the data, and publish it in one searchable place.` | `An independent index of public property listings across Cape Verde, published by AREI.` |

**Do not touch:**
- `mailto:info@kazaverde.com` (line 43) — email address and its visible "Contact" label stay
- `instagram.com/kazaverde.cv` (line 44) — href and label stay
- `x.com/kazaverdecv` (line 45) — href and label stay
- The existing `Powered by Africa Real Estate Index ↗` block (lines 52–60) — already correct, leave as-is

---

### 4. `kazaverde-web/src/pages/Home.tsx`

Two changes only: JSON-LD `name` field and the explicit title string passed to `useDocumentMeta`.

| Location | Current | Change to |
|----------|---------|-----------|
| Line 62 | `"name": "KazaVerde"` (Organization) | `"name": "Cape Verde Real Estate Index"` |
| Line 68 | `"name": "KazaVerde"` (WebSite) | `"name": "Cape Verde Real Estate Index"` |
| Line 63 | `"description": "Independent property index for Cape Verde real estate"` | `"description": "Cape Verde's independent real estate index, published by AREI."` |
| Line 76 | `useDocumentMeta("KazaVerde — Cape Verde Real Estate", ...)` | `useDocumentMeta("Cape Verde Real Estate Index", HOME_META_DESCRIPTION)` |

**Do not touch:**
- `"@id": "https://kazaverde.com/#organization"` (line 60)
- `"url": "https://kazaverde.com"` (lines 64 and 70)
- `HOME_META_DESCRIPTION` constant — already correct, no brand name in it

---

### 5. `kazaverde-web/src/pages/About.tsx`

The About page has the most KazaVerde prose. Changes target copy the user reads; structure stays identical.

**`useDocumentMeta` call (line 103–106):**

| Current | Change to |
|---------|-----------|
| `"About AREI / KazaVerde — KazaVerde"` | `"About Cape Verde Real Estate Index"` |
| `"KazaVerde is the first live market in the Africa Real Estate Index: a read-only, source-linked property index for Cape Verde."` | `"Cape Verde Real Estate Index is the first live market in AREI: a read-only, source-linked property index for Cape Verde."` |

**Page hero (lines 112–119):**

| Current | Change to |
|---------|-----------|
| eyebrow: `"About AREI / KazaVerde"` | `"About Cape Verde Real Estate Index"` |
| hero sub: `"KazaVerde is the first live market…"` | `"Cape Verde Real Estate Index is the first live market in AREI:…"` |

**`SECTIONS` data array — heading and body strings:**

| Current | Change to |
|---------|-----------|
| eyebrow: `"What KazaVerde does"` | `"What this index does"` |
| heading: `"Public listings, normalised into one searchable index."` | unchanged |
| body: `"KazaVerde collects publicly accessible listings…It is the first live market in the Africa Real Estate Index…"` | `"Cape Verde Real Estate Index collects publicly accessible listings…It is the first live market in AREI…"` |
| body (Why this exists): `"KazaVerde exists to make the public listing layer easier to read…"` | `"Cape Verde Real Estate Index exists to make the public listing layer easier to read…"` |

**`SECTIONS` list items (lines 27–31) — "What we are not":**

| Current | Change to |
|---------|-----------|
| `"KazaVerde does not broker property transactions."` | `"Cape Verde Real Estate Index does not broker property transactions."` |
| `"KazaVerde is not an estate agency…"` | `"Cape Verde Real Estate Index is not an estate agency…"` |
| `"KazaVerde is not a transaction platform…"` | `"Cape Verde Real Estate Index is not a transaction platform…"` |
| `"KazaVerde is not commission-led…"` | `"Cape Verde Real Estate Index is not commission-led…"` |

**`SECTIONS` body (line 52) — Deduplication:**

| Current | Change to |
|---------|-----------|
| `"…KazaVerde keeps one current public record…"` | `"…the index keeps one current public record…"` |

**`QUALITY_NOTES` array (lines 62–80):**

| Current | Change to |
|---------|-----------|
| `"KazaVerde does not fill in missing location detail…"` | `"The index does not fill in missing location detail…"` |
| `"KazaVerde is a read-only index, not the original publisher."` | `"Cape Verde Real Estate Index is a read-only index, not the original publisher."` |
| `"KazaVerde does not verify title, ownership…"` | `"Cape Verde Real Estate Index does not verify title, ownership…"` |
| `"The index reflects the public listings KazaVerde currently tracks."` | `"The index reflects the public listings Cape Verde Real Estate Index currently tracks."` |

**Coverage section (line 170):**

| Current | Change to |
|---------|-----------|
| `"KazaVerde does not claim full market coverage."` | `"Cape Verde Real Estate Index does not claim full market coverage."` |

---

### 6. `kazaverde-web/src/pages/Privacy.tsx` and `kazaverde-web/src/pages/CookiePolicy.tsx`

Update body copy references to "KazaVerde" where the product is named in prose. The page `<title>` will update automatically once `SITE_NAME` changes in the hook.

**Do not touch** `mailto:info@kazaverde.com` in either file — the email address and its display text ("Contact us at info@kazaverde.com") stay unchanged until an owner decision is made on the address.

Specific strings to update: search for "KazaVerde" in each file and replace with "Cape Verde Real Estate Index" **except** where it appears inside an href or mailto value.

---

### 7. `kazaverde-web/src/pages/Landing.tsx`

| Location | Current | Change to |
|----------|---------|-----------|
| Line 159–160 (useDocumentMeta title) | `"KazaVerde — Cape Verde Real Estate"` | `"Cape Verde Real Estate Index"` |
| JSON-LD name fields (lines 175–185) | `"name": "KazaVerde"` | `"name": "Cape Verde Real Estate Index"` |
| Any visible heading/copy text containing "KazaVerde" | update to "Cape Verde Real Estate Index" |

**Do not touch** JSON-LD `@id` or `url` fields.

---

### 8. `kazaverde-web/src/lib/blog-data.ts`

Update visible text only — post titles and description strings that name "KazaVerde". Do not touch any `href`, `<a>` tag target, or URL string embedded in article HTML.

---

## Explicit do-not-touch list for this PR

| Item | Reason |
|------|--------|
| Any `href`, `src`, or URL string | Route/domain change is Phase 4–5 |
| JSON-LD `@id` and `url` fields | Must match canonical domain until Phase 4 |
| `og:site_name`, `og:url`, `twitter:*` in `useDocumentMeta.ts` | OG/metadata pass is Phase 3 |
| `robots.txt` | Domain-bound |
| `vercel.json` (either file) | Active deployment config |
| `globals.css` / `--kv-*` tokens | Internal identifiers, no public visibility |
| `kazaverde-web/` folder | Build target |
| `package.json` `name` field | npm dependency resolution |
| `VITE_*` env vars | Environment config |
| `info@kazaverde.com` email address | Live operational address; owner decision |
| `instagram.com/kazaverde.cv` href | Social handle; owner decision |
| `x.com/kazaverdecv` href | Social handle; owner decision |
| `Footer.tsx` "Powered by Africa Real Estate Index ↗" block | Already correct — leave as-is |
| `DEFAULT_DESCRIPTION` in `useDocumentMeta.ts` | No "KazaVerde" in it; already correct |
| `SITE_TAGLINE` in `useDocumentMeta.ts` | Already "Cape Verde Real Estate Index"; leave as-is |
| Analytics event names | Data continuity |
| Database objects | Out of scope always |

---

## Acceptance criteria

- [ ] Every page `<title>` reads `{Page name} — Cape Verde Real Estate Index`
- [ ] Navbar logo text reads `Cape Verde Real Estate Index`
- [ ] Footer logo text reads `CAPE VERDE REAL ESTATE INDEX`
- [ ] Footer tagline updated; "Powered by Africa Real Estate Index" endorsement remains visible and linked
- [ ] About page: all prose "KazaVerde" replaced; page title and hero eyebrow updated
- [ ] JSON-LD `name` fields on Home and Landing updated; `@id` and `url` unchanged
- [ ] No `href` or `src` values changed anywhere in the PR diff
- [ ] `robots.txt`, `vercel.json`, `globals.css` not in the diff
- [ ] Build passes with no TypeScript errors
- [ ] Google Rich Results Test passes on Home and Landing JSON-LD (check after deploy to staging)
- [ ] No broken internal links (spot-check nav and footer links in browser)
- [ ] `info@kazaverde.com` still appears as a working contact link in Footer and legal pages
