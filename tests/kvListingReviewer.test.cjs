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

const { buildPatchSql } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildPatchSql sets only the fields present", () => {
  const { text, values } = buildPatchSql("hcv_xyz", { bedrooms: 2, property_type: "apartment" }, null);
  assert.match(text, /UPDATE kv_curated\.listings SET/);
  assert.match(text, /bedrooms\s*=\s*\$1/);
  assert.match(text, /property_type\s*=\s*\$2/);
  assert.match(text, /updated_at\s*=\s*now\(\)/);
  assert.match(text, /WHERE id\s*=\s*\$3/);
  assert.deepEqual(values, [2, "apartment", "hcv_xyz"]);
  assert.doesNotMatch(text, /publish_status/);
});

test("buildPatchSql includes publish_status when supplied", () => {
  const { text, values } = buildPatchSql("hcv_xyz", {}, "hidden");
  assert.match(text, /publish_status\s*=\s*\$1/);
  assert.match(text, /WHERE id\s*=\s*\$2/);
  assert.deepEqual(values, ["hidden", "hcv_xyz"]);
});

test("buildPatchSql stamps first_published_at when promoting to published", () => {
  const { text } = buildPatchSql("hcv_xyz", {}, "published");
  assert.match(text, /first_published_at\s*=\s*coalesce\(first_published_at,\s*now\(\)\)/);
});

test("buildPatchSql rejects empty patch with no publish_status", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", {}, null), /nothing to update/i);
});

test("buildPatchSql rejects unknown patch field", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", { foo: 1 }, null), /unknown patch key/i);
});

test("buildPatchSql rejects invalid publish_status", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", { bedrooms: 1 }, "weird"), /publish_status/);
});

test("buildPatchSql allows returning the row", () => {
  const { text } = buildPatchSql("hcv_xyz", { bedrooms: 1 }, null);
  assert.match(text, /RETURNING \*/);
});

test("buildPatchSql rejects undefined patch value", () => {
  assert.throws(
    () => buildPatchSql("hcv_xyz", { bedrooms: undefined }, null),
    /undefined.*use null/i,
  );
});

test("parseAndValidateVerdict still accepts a cheap-path verdict with no deep keys", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: { bedrooms: 2 },
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.fetch_status, undefined);
  assert.equal(v.missing_field_report, undefined);
});

test("parseAndValidateVerdict accepts a well-formed deep verdict", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.7,
    reasons: ["bedrooms missing from row but present on page"],
    suggested_patch: { bedrooms: 3 },
    fetch_status: "ok",
    missing_field_report: [
      { field: "bedrooms", status: "scraper_missed", found_value: 3, evidence: "\"3 bedroom villa\"", confidence: 0.9 },
      { field: "price", status: "absent_at_source", confidence: 0.8 },
    ],
    unmapped_fields: [
      { label: "terrace area", value: "85 m²", suggested_column: "terrace_area_sqm", type: "numeric", confidence: 0.7 },
    ],
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.fetch_status, "ok");
  assert.equal(v.missing_field_report[0].found_value, 3);
  assert.equal(v.unmapped_fields[0].suggested_column, "terrace_area_sqm");
});

test("parseAndValidateVerdict rejects found_value on a non-scraper_missed entry", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "absent_at_source", found_value: 100, confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /found_value is only allowed/i);
});

test("parseAndValidateVerdict rejects a bad missing_field_report status", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "dunno", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /missing_field_report.*status/i);
});

test("parseAndValidateVerdict rejects a bad fetch_status enum", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {}, fetch_status: "weird",
  });
  assert.throws(() => parseAndValidateVerdict(raw), /fetch_status/i);
});

test("parseAndValidateVerdict rejects a non-snake_case suggested_column", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    unmapped_fields: [{ label: "x", value: "y", suggested_column: "TerraceArea", type: "numeric", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /snake_case/i);
});

test("parseAndValidateVerdict rejects a bad unmapped_fields type", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    unmapped_fields: [{ label: "x", value: "y", suggested_column: "terrace_area_sqm", type: "json", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /unmapped_fields.*type/i);
});

test("parseAndValidateVerdict rejects out-of-range deep confidence", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "uncertain", confidence: 1.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /confidence/i);
});

const { buildDeepReviewPrompt } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildDeepReviewPrompt instructs the model to fetch the source URL", () => {
  const { system, user } = buildDeepReviewPrompt({
    id: "id", title: "2 Bed Villa", description: "Lovely villa.",
    source_url_primary: "https://example.com/listing/xyz",
    island: "Sal", city: "Santa Maria", property_type: "villa",
    bedrooms: null, bathrooms: null, price: 100000, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: ["a"], publish_status: "needs_review",
  });
  assert.match(system, /web_fetch/i);
  assert.match(system, /scraper_missed/);
  assert.match(system, /absent_at_source/);
  assert.match(system, /unmapped_fields/);
  assert.match(user, /https:\/\/example\.com\/listing\/xyz/);
});

test("buildDeepReviewPrompt lists only the currently-null fields as diagnosis targets", () => {
  const { user } = buildDeepReviewPrompt({
    id: "id", title: "t", description: "d", source_url_primary: "u",
    island: "Sal", city: "Santa Maria", property_type: "villa",
    bedrooms: null, bathrooms: null, price: 100000, currency: "EUR",
    property_size_sqm: null, land_area_sqm: 500,
    image_urls: ["a"], publish_status: "needs_review",
  });
  assert.match(user, /FIELDS TO DIAGNOSE/);
  assert.match(user, /bedrooms/);
  assert.match(user, /bathrooms/);
  assert.match(user, /property_size_sqm/);
  // non-null fields must NOT be diagnosis targets
  assert.doesNotMatch(user.split("FIELDS TO DIAGNOSE")[1], /land_area_sqm/);
  assert.doesNotMatch(user.split("FIELDS TO DIAGNOSE")[1], /\bprice\b/);
});

test("buildDeepReviewPrompt notes when there is no source URL", () => {
  const { user } = buildDeepReviewPrompt({
    id: "id", title: "t", description: "d", source_url_primary: null,
    island: "Sal", city: null, property_type: null,
    bedrooms: null, bathrooms: null, price: null, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: [], publish_status: "needs_review",
  });
  assert.match(user, /no source url/i);
});

const { buildScraperGapInsert } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildScraperGapInsert returns null for empty gaps", () => {
  assert.equal(buildScraperGapInsert("hcv_x", []), null);
  assert.equal(buildScraperGapInsert("hcv_x", undefined), null);
});

test("buildScraperGapInsert builds a multi-row insert", () => {
  const { text, values } = buildScraperGapInsert("hcv_x", [
    { field: "bedrooms", source_id: "cv_foo", value: 3, evidence: "3 bed", model: "claude-sonnet-4-6" },
    { field: "bathrooms", source_id: "cv_foo", value: 2 },
  ]);
  assert.match(text, /INSERT INTO kv_curated\.scraper_gap_log/);
  assert.match(text, /\(\$1, \$2, \$3, \$4, \$5, \$6\), \(\$7, \$8, \$9, \$10, \$11, \$12\)/);
  assert.deepEqual(values, [
    "hcv_x", "cv_foo", "bedrooms", "3", "3 bed", "claude-sonnet-4-6",
    "hcv_x", "cv_foo", "bathrooms", "2", null, null,
  ]);
});

test("buildScraperGapInsert rejects an entry missing field", () => {
  assert.throws(() => buildScraperGapInsert("hcv_x", [{ source_id: "cv_foo" }]), /field/i);
});

test("buildScraperGapInsert rejects an entry missing source_id", () => {
  assert.throws(() => buildScraperGapInsert("hcv_x", [{ field: "bedrooms" }]), /source_id/i);
});
