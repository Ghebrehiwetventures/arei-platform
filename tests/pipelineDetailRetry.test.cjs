const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { loadSourcesConfig } = require("../core/configLoader");
const {
  fetchDetailWithRetry,
  getDetailFetchMethod,
} = require("../core/pipeline/runMarketSource");

function cvSource(id) {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);
  const source = config.data.sources.find((candidate) => candidate.id === id);
  assert.ok(source, `source ${id} present`);
  return source;
}

test("EstateCV uses plain HTTP for both catalogue and detail fetches", () => {
  // Flipped from headless on 2026-06-11: plain HTTP returns the listing markup
  // and headless timed out on GitHub runners.
  const source = cvSource("cv_estatecv");
  assert.equal(source.fetch_method, "http");
  assert.equal(getDetailFetchMethod(source), "http");
});

test("EstateCV retry behavior comes from its sources.yml fetch_retry", async () => {
  const source = cvSource("cv_estatecv");
  assert.deepEqual(source.detail.fetch_retry, { attempts: 2, delay_ms: 1500 });

  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    if (attempts === 1) {
      return { success: false, error: "temporary browser failure" };
    }
    return { success: true, statusCode: 200, html: "<html>ok</html>" };
  };

  const result = await fetchDetailWithRetry(
    source.detail.fetch_retry,
    "https://estatecv.com/en/properties/lands/example",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 2);
  assert.equal(result.success, true);
  assert.equal(result.retried, true);
});

test("NhaKaza retry behavior comes from its sources.yml fetch_retry", async () => {
  const source = cvSource("cv_nhakaza");
  assert.deepEqual(source.detail.fetch_retry, { attempts: 2, delay_ms: 1500 });

  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    if (attempts === 1) {
      return { success: false, error: "temporary connection reset" };
    }
    return { success: true, statusCode: 200, html: "<html>ok</html>" };
  };

  const result = await fetchDetailWithRetry(
    source.detail.fetch_retry,
    "https://nhakaza.cv/comprar-apartamento/example",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 2);
  assert.equal(result.success, true);
  assert.equal(result.retried, true);
});

test("a source without fetch_retry does not retry", async () => {
  const source = cvSource("cv_oceanproperty24");
  assert.equal(source.detail?.fetch_retry, undefined);

  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    return { success: false, error: "failed" };
  };

  const result = await fetchDetailWithRetry(
    source.detail?.fetch_retry,
    "https://example.com/listing",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 1);
  assert.equal(result.success, false);
  assert.equal(result.retried, false);
});
