# Domain Canonical Migration: kazaverde.com → capeverderealestateindex.com

## Summary

| | |
|---|---|
| **Old domain** | `kazaverde.com` |
| **New canonical domain** | `capeverderealestateindex.com` |
| **Migration type** | Canonical URL swap with permanent redirects |
| **Date** | 2026-05-12 |
| **Status** | Vercel configured ✓ — code merged, deploy pending |

---

## AREI country-domain convention

Every country index follows this pattern:

| Role | Pattern |
|---|---|
| Canonical / Production | `[country]realestateindex.com` (root) |
| www | Permanent redirect → root |
| Legacy domain | Permanent redirect → root, path preserved |

Cape Verde is the first instance. Future countries (e.g. Morocco, Kenya) follow the same convention: root is Production, www redirects to root, any legacy/brand domain redirects to root with path preservation.

---

## Vercel domain state (confirmed 2026-05-12)

```
capeverderealestateindex.com          → Production (primary)
www.capeverderealestateindex.com      → 308 permanent redirect → capeverderealestateindex.com
kazaverde.com                         → 308 permanent redirect → capeverderealestateindex.com
www.kazaverde.com                     → 308 permanent redirect → capeverderealestateindex.com
```

The `kazaverde.com` and `www.kazaverde.com` redirects are handled at the Vercel edge level. The `vercel.json` redirect rules (with `has: host`) serve as an explicit in-repo record of the redirect intent and fire for any request reaching the project via those hostnames.

---

## Redirect strategy

Path-preserving redirects declared in `kazaverde-web/vercel.json`:

```
kazaverde.com/:path*     → https://capeverderealestateindex.com/:path*
www.kazaverde.com/:path* → https://capeverderealestateindex.com/:path*
```

All existing paths are preserved — `/listing/[id]`, `/listings`, `/market`, `/blog`, `/blog/[slug]`, `/about`, `/privacy`, `/cookie-policy` all redirect to the equivalent path on the new domain. No listing URLs break.

---

## What was changed

| File | What changed |
|---|---|
| `kazaverde-web/src/hooks/useDocumentMeta.ts` | `SITE_URL` SSR fallback → new domain |
| `kazaverde-web/src/pages/Detail.tsx` | `SITE_URL` SSR fallback → new domain |
| `kazaverde-web/src/pages/Landing.tsx` | JSON-LD origin SSR fallback → new domain |
| `kazaverde-web/scripts/prerender-phase1.mjs` | `siteUrl` constant → new domain; hardcoded JSON-LD Organization/WebSite/FAQPage `@id` and `url` fields → new domain |
| `kazaverde-web/public/robots.txt` | Sitemap URL → new domain |
| `kazaverde-web/src/pages/Home.tsx` | JSON-LD `HOMEPAGE_SCHEMA` — Organization and WebSite `@id`/`url` → new domain |
| `kazaverde-web/src/pages/BlogList.tsx` | FAQPage JSON-LD `@id` → new domain |
| `kazaverde-web/src/pages/Market.tsx` | FAQPage JSON-LD `@id` → new domain |
| `kazaverde-web/vercel.json` | Added path-preserving redirects from `kazaverde.com` and `www.kazaverde.com` → new domain |
| `kazaverde-web/src/pages/Privacy.tsx` | Policy body copy domain reference → new domain |

---

## What was intentionally not changed

| Item | Reason |
|---|---|
| `kazaverde-web/` folder name | Technical identifier — deferred, no user-visible impact |
| `--kv-*` CSS design tokens | Internal token naming — deferred |
| `info@kazaverde.com` email addresses | Email routing excluded from this migration |
| Analytics event names | Renaming breaks historical continuity |
| Social handles | Out of scope for this migration |
| Supabase schema, source IDs, database objects | No data changes |
| Blog content links to `kazaverde.com` | ~12 editorial links in blog article bodies — resolve correctly via redirect; separate editorial task |
| Package name `kazaverde-web` in `package.json` | Internal tooling identifier |

---

## Post-deploy verification checklist

**Redirects**
- [ ] `https://kazaverde.com` → redirects to `https://capeverderealestateindex.com`
- [ ] `https://www.kazaverde.com` → redirects to `https://capeverderealestateindex.com`
- [ ] `https://kazaverde.com/listing/[id]` → redirects to `https://capeverderealestateindex.com/listing/[same-id]`
- [ ] `https://www.capeverderealestateindex.com` → redirects to `https://capeverderealestateindex.com`

**New domain**
- [ ] `https://capeverderealestateindex.com` loads correctly
- [ ] `https://capeverderealestateindex.com/listing/cvp24_ee5de7169996` loads (known-good listing)

**Canonical / SEO signals**
- [ ] Page source `<link rel="canonical">` uses `https://capeverderealestateindex.com/`
- [ ] Page source `og:url` uses `https://capeverderealestateindex.com`
- [ ] Page source `twitter:image` / Twitter card URLs use new domain
- [ ] Page source JSON-LD `@id` and `url` fields use `https://capeverderealestateindex.com`
- [ ] `https://capeverderealestateindex.com/sitemap.xml` — all `<loc>` entries use new domain
- [ ] `https://capeverderealestateindex.com/robots.txt` — Sitemap line points to `https://capeverderealestateindex.com/sitemap.xml`

**Search Console**
- [ ] Add `capeverderealestateindex.com` as a Domain property in Google Search Console
- [ ] Submit sitemap: `https://capeverderealestateindex.com/sitemap.xml`
- [ ] Keep `kazaverde.com` Search Console property active — monitor for redirect coverage and crawl errors
