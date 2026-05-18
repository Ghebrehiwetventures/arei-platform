const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { buildKvCuratedUpsertQuery } = require("../scripts/ingest_to_curated");

test("curated upsert includes last_verified_at on insert and update", () => {
  const verifiedAt = "2026-05-12T20:10:00.000Z";
  const row = {
    id: "ccore_731730",
    title: "Luxury 2 bedroom apartment - Ilha de Santiago - Cidadela",
    description: "desc",
    description_html: null,
    ai_descriptions: { en: { text: "kept" } },
    price: 122432,
    currency: "EUR",
    price_period: "sale",
    country: "Cape Verde",
    island: "Santiago",
    city: "Praia",
    bedrooms: 2,
    bathrooms: 2,
    property_type: "apartment",
    property_size_sqm: 122.92,
    land_area_sqm: null,
    image_urls: ["https://cdn.example.com/a.jpg"],
    source_id_primary: "cv_ccoreinvestments",
    source_url_primary: "https://www.ccoreinvestments.com/en/property-detail/example/731730",
    first_seen_at: "2026-05-11T13:36:48.023Z",
    publish_status: "needs_review",
    seeded_from_raw_listing_id: "ccore_731730",
  };

  const query = buildKvCuratedUpsertQuery(row, verifiedAt);

  assert.match(query.text, /last_verified_at/);
  assert.match(query.text, /last_verified_at\s*=\s*EXCLUDED\.last_verified_at/);
  assert.equal(query.values[20], verifiedAt);
  assert.equal(query.values[21], "needs_review");
  assert.equal(query.values[22], "ccore_731730");
});
