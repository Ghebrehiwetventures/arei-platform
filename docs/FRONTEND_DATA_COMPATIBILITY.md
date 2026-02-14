# Utvärdering: Africa Property Finder ↔ Morabesa Data

**Datum:** 2026-02-11  
**Syfte:** Avgöra om frontend-sajten fungerar med vår Supabase-data.

---

## Sammanfattning

| Aspekt | Bedömning | Kommentar |
|--------|-----------|-----------|
| **Fält-mappning** | ⚠️ Delvis | 80% match, några fält saknas eller behöver transformation |
| **Listings-sida** | ✅ Fungerar | Efter adapter/mapping |
| **Karta** | ❌ Kräver fix | `lat`/`lng` finns inte i databasen |
| **Detail-sida** | ❌ Hårdkodad | Visar statisk data, inte dynamisk fetch |
| **Filter** | ✅ Fungerar | country, type, price, bedrooms mappas |
| **Slutsats** | **Ja, med anpassningar** | ~2–4 timmar arbete för integration |

---

## Fält-jämförelse

### Frontend förväntar sig (Property interface)

```typescript
id, title, location, country, city, price, currency,
bedrooms, bathrooms, area, areaUnit, status, image, source,
syncDate, type, tags[], lat, lng
```

### Morabesa Supabase har (SupabaseListing)

```typescript
id, source_id, source_url, title, description, price, currency,
island, city, bedrooms, bathrooms, property_size_sqm, land_area_sqm,
image_urls[], status, violations[], approved, country, property_type,
amenities[], price_period
```

### Mapping-tabell

| Frontend | Supabase | Lösning |
|----------|----------|---------|
| `id` | `id` | ✓ Direkt |
| `title` | `title` | ✓ Direkt |
| `location` | `island` + `city` eller `country` + `city` | Konstruera: `[city, island/country].filter(Boolean).join(", ")` |
| `country` | `country` | ✓ Direkt |
| `city` | `city` | ✓ Direkt |
| `price` | `price` | ✓ Direkt |
| `currency` | `currency` | ✓ Direkt |
| `bedrooms` | `bedrooms` | ✓ Direkt |
| `bathrooms` | `bathrooms` | ✓ Direkt |
| `area` | `property_size_sqm` | ✓ Direkt |
| `areaUnit` | - | Hårdkoda `"m²"` |
| `status` | `approved` | Mappa: `approved ? "verified" : "pending"` |
| `image` | `image_urls[0]` | Första bilden |
| `source` | `source_id` | ✓ Direkt |
| `syncDate` | - | Saknas – visa t.ex. tom sträng eller `"N/A"` |
| `type` | `property_type` | ✓ Direkt |
| `tags` | `amenities` | ✓ Direkt |
| `lat` | **SAKNAS** | ⚠️ Se nedan |
| `lng` | **SAKNAS** | ⚠️ Se nedan |

---

## Kritiska luckor

### 1. Lat/Lng – kartan fungerar inte

**Problem:** Karta (MapViewPage) använder `property.lat` och `property.lng`. Dessa finns inte i Supabase.

**Möjliga lösningar:**

- **A) Geokodning:** Geokoda från `city` + `country` (t.ex. via Nominatim/OpenStreetMap eller ett geocoding-API) – kostnad, rate limits.
- **B) Hoppa över karta:** Visa inte kartan tills vi har koordinater.
- **C) Lägg till lat/lng i pipeline:** Extrahera från källor om de finns, annars geokoda vid ingest.

**Rekommendation:** B tillfälligt. Karta optional/disabled tills vi har koordinater.

### 2. Detail-sida – hårdkodad

**Problem:** `/listing/:id` visar alltid samma statiska innehåll (Atlantic Seaboard Villa). Den använder inte `:id` för att hämta data.

**Lösning:**  
- Hämta listing från Supabase via `id`  
- Skicka den till `PropertyDetails` som prop  
- Visa `description`, `image_urls`, etc. dynamiskt

### 3. SyncDate

**Problem:** Vi lagrar inte när listingen senast indexerades.

**Lösning:** Hoppa över eller visa `"N/A"` tills vi lägger till `updated_at`/`created_at` i schema.

---

## Vad som fungerar utan ändringar

- **Listings-lista:** Filter (country, type, price, bedrooms), sortering, grid/list
- **PropertyCard:** Alla fält kan mappas från Supabase
- **Countries/Filter:** `country` finns – CV, KE, GH, NG, TZ stöds
- **Status:** `approved` mappas till verified/pending

---

## Implementationsplan

### Fas 1: Grundläggande integration (1–2 h)

1. Lägg till `@supabase/supabase-js` i frontend
2. Skapa `.env` med `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`
3. Skapa `transformListing()` som mappar Supabase → Property
4. Byta ut `properties` import mot Supabase-fetch i AllListingsPage, HomePage
5. Filtrera på `approved = true` (visible listings)

### Fas 2: Detail-sida (≈1 h)

1. `Index.tsx` – läs `:id` från route
2. Hämta listing från Supabase via `id`
3. Skicka till `PropertyDetails` som prop, rendera dynamiskt

### Fas 3: Karta (≈1 h eller disabled)

- **Alternativ A:** Inaktivera kartlänken eller visa "Karta kommer snart"
- **Alternativ B:** Geokoda city + country (lite mer arbete + API)

---

## Slutsats

**Sajten kan användas med vår data efter begränsad anpassning.**

- Listings-sida: direkt möjlig efter mapping
- Filter: fungerar
- Detail-sida: kräver dynamisk fetch
- Karta: kräver lat/lng – antingen lägg till i pipeline eller stäng av tillsvidare

**Rekommendation:** Börja med Fas 1 + 2. Behåll karta som kommande feature tills vi har koordinater.
