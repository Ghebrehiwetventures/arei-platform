const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const {
  buildKvCuratedUpsertQuery,
  buildFindRemovedPublishedRowsQuery,
  buildDemoteRemovedPublishedRowsQuery,
} = require("../scripts/ingest_to_curated");

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

test("removed published lookup is disabled when a source fetch returns no rows", () => {
  assert.equal(buildFindRemovedPublishedRowsQuery("cv_ccoreinvestments", []), null);
  assert.equal(
    buildDemoteRemovedPublishedRowsQuery("cv_ccoreinvestments", [], "2026-06-05T12:00:00.000Z"),
    null
  );
});

test("removed published lookup finds published rows absent from current source ids", () => {
  const query = buildFindRemovedPublishedRowsQuery("cv_ccoreinvestments", ["ccore_1", "ccore_2"]);

  assert.ok(query);
  assert.match(query.text, /publish_status = 'published'/);
  assert.match(query.text, /NOT \(id = ANY\(\$2::text\[\]\)\)/);
  assert.equal(query.values[0], "cv_ccoreinvestments");
  assert.deepEqual(query.values[1], ["ccore_1", "ccore_2"]);
});

test("removed published demotion only updates currently published missing rows", () => {
  const removedAt = "2026-06-05T12:00:00.000Z";
  const query = buildDemoteRemovedPublishedRowsQuery("cv_ccoreinvestments", ["ccore_1"], removedAt);

  assert.ok(query);
  assert.match(query.text, /SET\s+publish_status = 'removed'/);
  assert.match(query.text, /publish_status = 'published'/);
  assert.match(query.text, /NOT \(id = ANY\(\$2::text\[\]\)\)/);
  assert.match(query.text, /RETURNING id, title, source_url_primary/);
  assert.equal(query.values[0], "cv_ccoreinvestments");
  assert.deepEqual(query.values[1], ["ccore_1"]);
  assert.equal(query.values[2], removedAt);
});
