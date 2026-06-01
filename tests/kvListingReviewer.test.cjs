const test = require("node:test");
const assert = require("node:assert/strict");

const { buildReviewPrompt, parseAndValidateVerdict } = require("../arei-admin/api/_reviewerLib.cjs");

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

test("parseAndValidateVerdict accepts a clean verdict", () => {
  const raw = JSON.stringify({
    verdict: "hold",
    confidence: 0.8,
    reasons: ["title says 2 Bed, bedrooms is null"],
    suggested_patch: { bedrooms: 2 },
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.verdict, "hold");
  assert.equal(v.suggested_patch.bedrooms, 2);
});

test("parseAndValidateVerdict strips a json code fence", () => {
  const raw = "```json\n" + JSON.stringify({
    verdict: "publish", confidence: 0.9, reasons: ["ok"], suggested_patch: {},
  }) + "\n```";
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.verdict, "publish");
});

test("parseAndValidateVerdict rejects unknown patch keys", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"],
    suggested_patch: { not_a_field: 1 },
  });
  assert.throws(() => parseAndValidateVerdict(raw), /unknown patch key/i);
});

test("parseAndValidateVerdict rejects bad verdict enum", () => {
  const raw = JSON.stringify({
    verdict: "maybe", confidence: 0.5, reasons: ["x"], suggested_patch: {},
  });
  assert.throws(() => parseAndValidateVerdict(raw), /verdict/);
});

test("parseAndValidateVerdict requires reasons array", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: "nope", suggested_patch: {},
  });
  assert.throws(() => parseAndValidateVerdict(raw), /reasons/);
});

test("parseAndValidateVerdict rejects array suggested_patch", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"],
    suggested_patch: [],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /suggested_patch must be an object/);
});

test("parseAndValidateVerdict rejects empty reasons array", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: [],
    suggested_patch: {},
  });
  assert.throws(() => parseAndValidateVerdict(raw), /reasons/);
});
