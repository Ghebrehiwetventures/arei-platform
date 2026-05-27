const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { deriveSourceHealthReport } = require("../core/pipeline/runMarketSource");
const { SourceStatus } = require("../core/status");

test("deriveSourceHealthReport: OK when listings present even with non-parser warnings", () => {
  const report = deriveSourceHealthReport("cv_example", {
    listings: [{ id: "a" }, { id: "b" }],
    debugErrors: ["Page 3: HTTP 503"],
  });
  assert.equal(report.status, SourceStatus.OK);
  assert.deepEqual(report.debugErrors, ["Page 3: HTTP 503"]);
});

test("deriveSourceHealthReport: BROKEN_SOURCE when zero listings + parser diagnostics", () => {
  const report = deriveSourceHealthReport("cv_example", {
    listings: [],
    debugErrors: ["page_parse_error: missing selector .listing"],
  });
  assert.equal(report.status, SourceStatus.BROKEN_SOURCE);
  assert.equal(report.lastError, "page_parse_error: missing selector .listing");
});

test("deriveSourceHealthReport: BROKEN_SOURCE when fetch threw", () => {
  const report = deriveSourceHealthReport("cv_example", {
    listings: [],
    debugErrors: [],
    threwError: "network unreachable",
  });
  assert.equal(report.status, SourceStatus.BROKEN_SOURCE);
  assert.equal(report.lastError, "network unreachable");
});

test("deriveSourceHealthReport: PARTIAL_OK when zero listings without parser diagnostics", () => {
  const report = deriveSourceHealthReport("cv_example", {
    listings: [],
    debugErrors: ["empty_listings"],
  });
  assert.equal(report.status, SourceStatus.PARTIAL_OK);
});

test("deriveSourceHealthReport: truncates lastError from thrown to 100 chars", () => {
  const longMsg = "x".repeat(250);
  const report = deriveSourceHealthReport("cv_example", {
    listings: [],
    debugErrors: [],
    threwError: longMsg,
  });
  assert.equal(report.lastError.length, 100);
});
