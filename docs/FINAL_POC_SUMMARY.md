# PoC Complete – Africa Property Index

**Status:** ✅ Mål uppnått  
**Datum:** 2026-02-10  

---

## Sammanfattning

5 afrikanska marknader live med **~90% genomsnittlig visible %** – samma kod genomgående, inga lokala undantag. Genericitet bevisad.

---

## Resultat

| Market | Visible % | Listings | Sources |
|--------|-----------|----------|---------|
| CV (Cape Verde) | 94% | 139 | 7 |
| KE (Kenya) | 77.5% | 151 | 3 |
| GH (Ghana) | 90.1% | 101 | 2 |
| NG (Nigeria) | 100% | 50 | 1 |
| TZ (Tanzania) | 93.1% | 87 | 3 |
| **Snitt** | **~91%** | **528** | **16** |

---

## Bevis: CV → KE → GH → NG → TZ

- **CV:** Baseline, flera källor, island-location mapping
- **KE:** 101 nya listings (2026-02-10), headless + http mixes
- **GH:** PropertyCentre-portal, hög kvalitet
- **NG:** 100% visible, NPC-perfekt
- **TZ:** Stabil kvalitet

**Ingen kodändring mellan marknader. Endast YAML-konfiguration.**

---

## Moat: YAML-skalning

- Nya marknader = `sources.yml` + `locations.yml`
- Ingen ny kod, inga lokala undantag
- CMS-presets och config-driven detail extraction
- Hastighet: 1 dag per ny marknad vs 2–4 veckor (konkurrenter)

---

## Nästa fas

**Prioritet:** Pitch/demo – ingen ny ingest.

- [ ] Read-only vy
- [ ] API-beta
- [ ] Monetisering och lead generation

---

*PoC-arbetet är avslutat. Dokumentationen finns i POC_RESULTS.md och ARCHITECTURE.md.*
