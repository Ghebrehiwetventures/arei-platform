const test = require("node:test");
const assert = require("node:assert/strict");

const { buildReviewPrompt } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildReviewPrompt embeds title, description, and structured fields", () => {
  const row = {
    id: "hcv_xyz",
    title: "Ground Floor 2 Bed KEY READY Apartment",
    description: "A two-bedroom apartment in Vila Verde, Santa Maria, Sal.",
    source_url_primary: "https://example.com/listing/xyz",
    island: "Sal",
    city: "Santa Maria",
    property_type: "apartment",
    bedrooms: null,
    bathrooms: null,
    price: 97500,
    currency: "EUR",
    property_size_sqm: null,
    land_area_sqm: null,
    image_urls: ["a", "b", "c"],
    publish_status: "needs_review",
  };

  const { system, user } = buildReviewPrompt(row);

  assert.match(system, /Output JSON only/);
  assert.match(system, /publish.*hold.*hide/);
  assert.match(system, /Boa Vista/);
  assert.match(system, /apartment/);
  assert.match(user, /Ground Floor 2 Bed KEY READY Apartment/);
  assert.match(user, /Vila Verde/);
  assert.match(user, /"bedrooms": null/);
  assert.match(user, /"image_urls_count": 3/);
});

test("buildReviewPrompt truncates very long descriptions", () => {
  const long = "x".repeat(5000);
  const { user } = buildReviewPrompt({
    id: "id", title: "t", description: long, source_url_primary: "u",
    island: "Sal", city: null, property_type: null,
    bedrooms: null, bathrooms: null, price: null, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: [], publish_status: "needs_review",
  });
  assert.ok(user.length < 4000, `user prompt was ${user.length} chars, expected < 4000`);
  assert.match(user, /truncated/);
});
