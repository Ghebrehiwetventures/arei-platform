# Cape Verde (CV)

**Status:** ✅ LIVE  
**Visible %:** 94%  
**Listings:** 139  
**Sources:** 3 active, 4 monitor

## Sources

| ID | Name | Lifecycle | Tier | Method | Notes |
|----|------|-----------|------|--------|-------|
| `cv_terracaboverde` | Terra Cabo Verde | IN | monitor | headless | Elementor, stale-heavy but still active |
| `cv_simplycapeverde` | Simply Cape Verde | IN | active | http | Single page |
| `cv_homescasaverde` | Homes Casa Verde | IN | monitor | headless | Houzez theme, stale-heavy |
| `cv_capeverdeproperty24` | Cape Verde Property 24 | IN | active | http | Offset pagination |
| `cv_cabohouseproperty` | Cabo House Property | IN | monitor | headless | MyHome theme, stale-heavy |
| `cv_estatecv` | Estate CV | IN | active | headless | Multi-island |
| `cv_oceanproperty24` | Ocean Property 24 | IN | monitor | http | WP Residence, highest stale share in active set |

## Deprecated Sources

- **cv_capeverdepropertyuk** – Cloudflare blocks all requests
- **cv_ccoreinvestments** – historical stale remainder, no current run metrics
- **cv_rightmove** – historical stale remainder, no current run metrics
- **cv_globallistings** – historical stale remainder, no current run metrics
- **cv_properstar** – dropped aggregator
- **cv_greenacres** – historical stale remainder, no current run metrics

## Known Issues

- **Amenities:** 0% coverage (keywords need expansion)
- **Bathrooms:** Missing on some sources (spec patterns need tuning)
- **Images patch:** URL normalization needed

## Location Mapping

Uses **islands** structure (`locations.yml`):
- Sal → Santa Maria (default)
- Boa Vista → Sal Rei (default)
- Santiago → Praia
- São Vicente → Mindelo

## Quality Metrics

- Description: **95%**
- Images (≥3): **77%**
- Bedrooms: **72%**
- Bathrooms: **68%**

## Next Steps

- [ ] Expand amenity keywords (Portuguese)
- [ ] Fix bathrooms extraction patterns
- [ ] Implement image URL normalization
- [ ] Add proxy for cv_capeverdepropertyuk
