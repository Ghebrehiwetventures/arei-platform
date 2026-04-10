# Cape Verde (CV)

**Status:** ✅ LIVE  
**Visible %:** 94%  
**Listings:** 139  
**Sources:** 7 active

## Sources

| ID | Name | Status | Method | Notes |
|----|------|--------|--------|-------|
| `cv_terracaboverde` | Terra Cabo Verde | IN | headless | Elementor, click pagination |
| `cv_simplycapeverde` | Simply Cape Verde | IN | http | Single page |
| `cv_homescasaverde` | Homes Casa Verde | IN | headless | Houzez theme |
| `cv_capeverdeproperty24` | Cape Verde Property 24 | IN | http | Offset pagination |
| `cv_cabohouseproperty` | Cabo House Property | IN | headless | MyHome theme |
| `cv_estatecv` | Estate CV | IN | headless | Multi-island |
| `cv_oceanproperty24` | Ocean Property 24 | IN | http | WP Residence |
| `cv_ccoreinvestments` | CCore Investments | IN | http | CasafariCRM/Proppy, ?page=N pagination |

## Dropped Sources

- **cv_capeverdepropertyuk** – Cloudflare blocks all requests

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
