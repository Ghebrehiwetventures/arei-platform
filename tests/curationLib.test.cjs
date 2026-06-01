const test = require("node:test");
const assert = require("node:assert/strict");

const { buildListingsQuery } = require("../arei-admin/api/_curationLib.cjs");

test("buildListingsQuery with no filters returns all rows ordered by first_seen_at desc", () => {
  const { text, values } = buildListingsQuery({});
  assert.match(text, /FROM kv_curated\.listings l/);
  assert.match(text, /LEFT JOIN LATERAL/);
  assert.match(text, /ORDER BY l\.first_seen_at DESC NULLS LAST/);
  assert.match(text, /LIMIT \$\d+ OFFSET \$\d+/);
  // limit + offset are always present (default 200 / 0)
  assert.deepEqual(values, [200, 0]);
});

test("buildListingsQuery applies status filter when not 'all'", () => {
  const { text, values } = buildListingsQuery({ status: "needs_review" });
  assert.match(text, /l\.publish_status = \$1/);
  assert.equal(values[0], "needs_review");
});

test("buildListingsQuery skips status filter when 'all'", () => {
  const { text } = buildListingsQuery({ status: "all" });
  assert.doesNotMatch(text, /publish_status\s*=/);
});

test("buildListingsQuery rejects unknown status", () => {
  assert.throws(() => buildListingsQuery({ status: "weird" }), /status/);
});

test("buildListingsQuery applies source_id and island", () => {
  const { text, values } = buildListingsQuery({ source_id: "cv_remax", island: "Sal" });
  assert.match(text, /l\.source_id_primary = \$1/);
  assert.match(text, /l\.island = \$2/);
  assert.deepEqual(values.slice(0, 2), ["cv_remax", "Sal"]);
});

test("buildListingsQuery applies q against title and id (case-insensitive)", () => {
  const { text, values } = buildListingsQuery({ q: "vila verde" });
  assert.match(text, /\(l\.title ILIKE \$1 OR l\.id ILIKE \$1\)/);
  assert.equal(values[0], "%vila verde%");
});

test("buildListingsQuery applies price bounds", () => {
  const { text, values } = buildListingsQuery({ price_min: 50000, price_max: 100000 });
  assert.match(text, /l\.price >= \$1/);
  assert.match(text, /l\.price <= \$2/);
  assert.deepEqual(values.slice(0, 2), [50000, 100000]);
});

test("buildListingsQuery applies flagged_hide via LATERAL join", () => {
  const { text } = buildListingsQuery({ flagged_hide: true });
  // last_review.verdict = 'hide' AND publish_status != 'hidden'
  assert.match(text, /last_review\.verdict = 'hide'/);
  assert.match(text, /l\.publish_status <> 'hidden'/);
});

test("buildListingsQuery applies first_seen_after", () => {
  const { text, values } = buildListingsQuery({ first_seen_after: "2026-05-25" });
  assert.match(text, /l\.first_seen_at >= \$1/);
  assert.equal(values[0], "2026-05-25");
});

test("buildListingsQuery caps limit at 500", () => {
  const { values } = buildListingsQuery({ limit: 9999 });
  assert.equal(values[values.length - 2], 500);
});

test("buildListingsQuery countText reuses the same WHERE clause", () => {
  const q = buildListingsQuery({ status: "needs_review", source_id: "cv_remax" });
  assert.match(q.countText, /SELECT COUNT\(\*\) FROM kv_curated\.listings l/);
  assert.match(q.countText, /l\.publish_status = \$1/);
  assert.match(q.countText, /l\.source_id_primary = \$2/);
  // count query does NOT include the limit/offset values
  assert.deepEqual(q.countValues, ["needs_review", "cv_remax"]);
});
