const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { buildRequestHeaders } = require("../core/fetcher/index");
const { buildFetchConfigFromYaml } = require("../core/fetcher/buildFetchConfig");

test("honors the per-source userAgent config override", () => {
  const headers = buildRequestHeaders({ userAgent: "TestAgent/1.0" });
  assert.equal(headers["User-Agent"], "TestAgent/1.0");
});

test("does not send WAF-fingerprint no-cache headers", () => {
  const headers = buildRequestHeaders({});
  assert.equal(headers["Cache-Control"], undefined);
  assert.equal(headers["Pragma"], undefined);
  // the browser-like baseline stays
  assert.ok(headers["Accept"].startsWith("text/html"));
  assert.ok(headers["Accept-Language"]);
});

test("picks a browser UA when no override is set", () => {
  const headers = buildRequestHeaders({});
  assert.match(headers["User-Agent"], /^Mozilla\/5\.0/);
});

test("buildFetchConfigFromYaml passes userAgent through from sources.yml shape", () => {
  const config = buildFetchConfigFromYaml({
    id: "x_test",
    name: "X",
    url: "https://example.com/list",
    userAgent: "ConfiguredAgent/2.0",
  });
  assert.equal(config.userAgent, "ConfiguredAgent/2.0");
  assert.equal(buildRequestHeaders(config)["User-Agent"], "ConfiguredAgent/2.0");
});
