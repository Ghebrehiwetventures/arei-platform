# Blog factual-integrity release gate — 2026-06-19

Supersedes the 2026-06-18 audit. This is the release-gate ledger: every retained
precise legal/tax/residency/nationality/property/exchange-control claim on a
published page is tied to an **exact primary provision** verified against the
Boletim Oficial PDF (retrieved via `curl` + `pdftotext` on 2026-06-19), all
unreproducible market figures have been removed from prose, and the citation
registry is a single source of truth.

Scope: the `/blog` FAQ + the 12 published guides. The offline article
`cape-verde-rental-yields-realistic` is hidden via `OFFLINE_SLUGS`, excluded from
publication, and guarded by the lint; it is out of scope and still holds legacy
claims (see Internal questions).

## RELEASE VERDICT: **READY**

- Unresolved factual claims on published surfaces: **0**
- Placeholder citations supporting a published precise claim: **0**
- Unreproducible market statistics published as fact: **0**

## Totals

| Metric | Count |
| --- | ---: |
| Published guides reviewed | 12 |
| FAQ entries reviewed (EN + PT) | 12 + 12 |
| Published claims reviewed | 75 |
| Retained with **exact primary citation** | 14 |
| — of which legislation (Boletim Oficial) | 12 |
| — of which government/regulator (DNRE, BCV) | 2 |
| Official-statistics claims retained | 0 (INE figures removed — primary not machine-obtainable) |
| AREI-dataset references (qualitative, no frozen numbers) | 7 inline across 5 guides |
| Editorial recommendations / scenarios | many (not counted as factual claims) |
| Claims **removed** (this pass + carried) | 29 |
| Claims **qualified** (scoped / "confirm with…") | 13 |
| **Unresolved public claims** | **0** |
| **Placeholder citations** | **0** |

## Single canonical source registry

`kazaverde-web/src/lib/sources.data.mjs` is the sole registry (10 sources). It is
imported by the browser bundle (`BlogPost.tsx`), the prerender, and the lint, and
renders each guide's Sources section from `article.sourceIds`. The previous
duplication (a second copy of source metadata inside `blog-data.ts` as `SRC_LI`)
and the `Object()` dynamic-index workaround have been removed. `blog-data.ts` now
stores only an ordered `sourceIds` array per article plus inline `[n]` markers; a
`<!--SOURCES-->` placeholder is replaced from the registry at render time.

The lint (`scripts/lint-blog-content.mjs`, in `npm test`) fails if: a citation
references a missing source; an inline cite is not declared in `sourceIds`; a
declared source is never cited (orphan); a rendered Sources anchor is absent; a
legislation source lacks gazette/article metadata or points at a homepage instead
of the direct gazette document; duplicate source IDs exist; a known bad phrase
appears; a prohibited commercial number appears unannotated; or the offline
article leaves `OFFLINE_SLUGS` / leaks into the published list.

## Retained legal/official claims — exact primary citations

| Route(s) | Claim | Law / regulation | Gazette | Article | Direct URL |
| --- | --- | --- | --- | --- | --- |
| green-card, buying | Green Card renewable every 5 years, then 10 years from the 2nd renewal | Lei n.º 30/IX/2018 | BO I Série n.º 23, 23 Apr 2018, p.539 | art. 8.º | https://boe.incv.cv/Bulletins/Download/2506 |
| green-card, buying, tax | Thresholds €80,000 / €120,000 by municipal GDP per capita; island GDP fallback | Lei n.º 30/IX/2018 | BO I Série n.º 23, 23 Apr 2018 | art. 3.º | https://boe.incv.cv/Bulletins/Download/2506 |
| green-card, tax | Green Card tax benefit: exemption from IUP and IRPS | Lei n.º 30/IX/2018 | BO I Série n.º 23, 23 Apr 2018 | art. 6.º | https://boe.incv.cv/Bulletins/Download/2506 |
| green-card | Casa do Cidadão is the single counter (Balcão Único); DEF is the competent authority | Decreto-Regulamentar n.º 1/2020 | BO I Série n.º 2, 7 Jan 2020 | art. 3.º | https://boe.incv.cv/Bulletins/Download/3062 |
| green-card | DEF decides within 15 days from receipt of the art. 6 documents | Decreto-Regulamentar n.º 1/2020 | BO I Série n.º 2, 7 Jan 2020 | art. 14.º | https://boe.incv.cv/Bulletins/Download/3062 |
| tax, buying, green-card | ITI: 1% general; 3% where transferor/acquirer benefits from a privileged-tax regime (per Código Geral Tributário); in force 1 Jan 2026 | Lei n.º 54/X/2025 (Código do ITI) | BO I Série n.º 46, 6 Jun 2025 | art. 11.º | https://boe.incv.cv/Bulletins/Download/23602 |
| tax, buying, green-card | IPI general rate 0.1%; in force 1 Jan 2026 | Lei n.º 55/X/2025 (Código do IPI) | BO I Série n.º 46, 6 Jun 2025 | art. 28.º | https://boe.incv.cv/Bulletins/Download/23602 |
| tax, buying, sal-vs-santiago, management | IPI 0.15% for *terrenos para construção*, on a special base = 10% of the value of the planned buildings | Lei n.º 55/X/2025 | BO I Série n.º 46, 6 Jun 2025 | art. 23.º | https://boe.incv.cv/Bulletins/Download/23602 |
| tax, buying, sal-vs-santiago, management | IPI surcharge +25% (vacant/ruined/degraded urban) and +10% (unfinished principal façade) | Lei n.º 55/X/2025 | BO I Série n.º 46, 6 Jun 2025 | art. 24.º | https://boe.incv.cv/Bulletins/Download/23602 |
| tax, green-card | ITI/IPI codes keep in force tax benefits established under special legislation (general terms; codes do not name the Green Card statute) | Lei n.º 54/X/2025 & 55/X/2025 | BO I Série n.º 46, 6 Jun 2025 | Código do ITI art. 6.º, n.º 3; Código do IPI art. 11.º, n.º 2; + Lei n.º 55/X/2025 art. 5.º (Remissões) | https://boe.incv.cv/Bulletins/Download/23602 |
| green-card, buying | Naturalisation requires legally residing in Cape Verde at least 5 years + cumulative conditions; not automatic | Lei n.º 33/X/2023 | BO I Série n.º 89, 22 Aug 2023 | art. 13.º, n.º 1, al. a) | https://boe.incv.cv/Bulletins/Download/4995 |
| buying (blockquote), FAQ | Cross-border transfer of investment income/proceeds & capital abroad via authorised financial institutions, for foreign-sourced, registered investment | Código de Investimento (Lei n.º 13/VIII/2012, alt. Decreto-Lei n.º 34/2013) | BO I Série n.º 50, 24 Sep 2013 | art. 7.º | https://boe.incv.cv/Bulletins/Download/1746 |
| buying, FAQ | NIF: non-resident may use a passport; official service is free; service points include Repartições de Finanças and Casa do Cidadão | DNRE "Solicitar NIF" (official service page) | — | — | https://www.mf.gov.cv/web/dnre/solicitar-nif |
| buying, FAQ, financing | Escudo pegged to the euro at 1 EUR = 110.265 CVE | Banco de Cabo Verde (foreign-exchange FAQ) | — | — | https://www.bcv.cv/en/Supervisao/Consumidores/Servi%C3%A7os%20ao%20P%C3%BAblico/perguntasrespostasfrequentes/mercadocambial/Paginas/MercadoCambial.aspx |

All gazette download URLs and the two government pages returned HTTP 200 on
2026-06-19; the legal provisions above were read from the downloaded PDFs with
`pdftotext -layout`.

## Market-data disposition — PATH B (figures removed)

`/blog/cape-verde-property-prices-by-island` no longer prints any island median,
listing count, price range, or comparative percentage. The historic April-2026
snapshot figures (~145/~130/~85/~40 listings; ~€99,000/€238,000/€110,000/€145,000
medians; "roughly four hundred"; "around twenty"; "under ten") were **removed**
because that past snapshot is not reproducible. The guide is now qualitative and
directs readers to the live `/market` page, which is generated from current index
records (reproducible at view time). The exact disclosure —
"Based on monitored asking-price listings. Not transaction prices or valuations."
— sits adjacent to the market discussion. Title, description, FAQ, JSON-LD, and PT
metadata were updated to drop the "medians and counts" framing. No median is
called an index value; no ticker-like value is published; no transaction-price
coverage or appreciation is implied.

## Removed this pass (precise claim deleted; primary not obtainable)

| Surface | Removed | Reason |
| --- | --- | --- |
| tax, which-island | INE "1,248,052 guests in hotel establishments 2025" | INE page is a client-rendered shell; primary publication not machine-obtainable. Replaced with a pointer to INE. |
| boa-vista | Island population "~15,000 (census)" | Census figure not verified against the INE primary table. Replaced with qualitative wording + pointer to INE. |
| which-island | UNESCO-attributed "early origin of morna with Boa Vista" | UNESCO doc URL returned HTML, not the nomination PDF; the precise attribution could not be verified. Narrowed to "national tradition, not a single island." |
| which-island, boa-vista, sal | `caboverde-airports` citation + any route list | Airport site returned HTTP 406. Wording kept deliberately non-committal ("served by Cesária Évora International Airport; routes seasonal — check current schedules"); no citation attached to a route claim. |
| prices-by-island | All island medians, counts, ranges, comparative %s | PATH B — unreproducible snapshot (see above). |

(These are in addition to the 22 unsupported commercial numbers removed in the
2026-06-18 pass — 5–8%/3–5%/10–15% yields & appreciation, 25–35%/15–25% fees,
6–9% rates, 50–70%/60–70% LTV, 20–25y terms, 4–12/4–8/6–12-week timelines,
€500–1,500 / €420 / €200–300 / €3,000 / €50–150 / €600–2,000 fees, etc.)

## Statement-type classification (public surfaces)

- **Statutory/official fact** — only where tied to an exact provision in the table above (e.g. renewal cycle, ITI/IPI rates, 15-day decision, naturalisation 5-year requirement).
- **Supported legal inference** — the **Green Card tax benefit carrying into 2026** is presented as an inference, not a categorical fact: the Green Card statute (Lei 30/IX/2018, art. 6.º) grants the IUP/IRPS exemption (direct fact), and the ITI/IPI codes preserve special-legislation benefits in *general terms* (Código do ITI art. 6.º n.º 3; Código do IPI art. 11.º n.º 2 — direct fact) **without naming the Green Card statute**. Public wording therefore states both facts and adds: "Whether and how a benefit applies to a particular acquisition should be confirmed with qualified Cape Verdean counsel and the competent tax authority." This is **transaction-specific advice**, not a categorical "the exemption carries over."
- **AREI dataset observation** — qualitative per-island descriptions + the live `/market` pointer; carries the disclosure; no frozen numbers.
- **Attributed third-party** — the RE/MAX "German buyers" remark is the agency's own dated statement (early 2026), explicitly not index-verified.
- **Editorial recommendation/scenario** — "model a range of delay scenarios", "instruct independent counsel", etc.

## Offline route disposition (`/blog/cape-verde-rental-yields-realistic`)

The route does **not** rely on the absence of a static file. The prerender writes
a **noindex tombstone** at `dist/blog/cape-verde-rental-yields-realistic/index.html`
and `vercel.json` adds an `X-Robots-Tag: noindex, nofollow` response header for
the exact path (both trailing- and non-trailing-slash forms). The tombstone has:
`<meta name="robots" content="noindex,nofollow">`, **no** canonical, **no**
Article/BreadcrumbList/FAQ JSON-LD, **no** legacy article body, **no** market/yield
claims. It is absent from the sitemap, and no published guide links to it. A
build-time guard (`assertOfflineInvariants` in the prerender) and the lint
(`scripts/lint-blog-content.mjs`) both fail if any of these invariants break or
the slug leaves `OFFLINE_SLUGS` / enters `BLOG_ARTICLES`.

## dateModified architecture

`dateModified` is **article-owned**: each guide carries a `modifiedAt` field in
`blog-data.ts` (all 12 set to `2026-06-19` for this release). The prerender's
Article JSON-LD `dateModified`, the prerendered `og:article:modified_time`, and
the runtime `og:article:modified_time` (via `useDocumentMeta`) all read this one
per-article field — there is no global constant. `datePublished` preserves each
article's original `date`. The lint requires every published guide to have a
valid ISO `modifiedAt` that is `>= date`.

## Internal research questions (NOT asserted as fact on the public site)

These remain open as internal/redirect-to-source items. The public site does not
state any of them as a fact:

1. Current INE tourism total and current per-island census population — the guides point readers to INE rather than printing a figure.
2. The exact text of the UNESCO morna nomination — narrowed wording avoids the unverified attribution.
3. Current airport route lists — guides say "seasonal, check current schedules."
4. A formal methodology-v1.0 document for the live `/market` medians — the guide describes the live computation and prints no frozen number, so nothing on the public page depends on it.
5. Re-audit of the offline `cape-verde-rental-yields-realistic` article before it can ever be republished — enforced by the lint's offline guard.

## Verification commands (2026-06-19)

- `curl -fsSL` + `pdftotext -layout` on Boletim Oficial bulletins 2506/3062/23602/4995/1746 → provisions above confirmed; bulletins 23602 confirm Lei 54/X/2025 (ITI) and Lei 55/X/2025 (IPI).
- `curl` HTTP status on all 7 external registry URLs → 200.
- `tsc -b`, `npm test` (incl. factual lint with claim-level-locator, modifiedAt, and offline guards), `npm run build` (vite + prerender + build-time offline invariant check) → pass.
- dist checks: 12 guides × (1 Article + 1 BreadcrumbList) JSON-LD valid; each Article `dateModified` equals the article's `modifiedAt` (2026-06-19); `og:article:modified_time`/`published_time` present; all citation anchors resolve; FAQPage = 12 questions = visible `<dt>`; internal `/blog` links resolve; no forbidden phrase, INE figure, or stale link in published HTML.
- offline route: tombstone at `/blog/cape-verde-rental-yields-realistic/index.html` carries `noindex,nofollow`, no canonical, no JSON-LD, no legacy/market content; `X-Robots-Tag: noindex, nofollow` configured in `vercel.json`; not in sitemap; no inbound links.
- claim-level locators: every legal source carries an exact `art. N` locator; negative tests confirm the lint fails on a vague locator and on `modifiedAt < publishedAt`.
