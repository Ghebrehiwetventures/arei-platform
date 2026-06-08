const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { loadSourcesConfig } = require("../core/configLoader");
const {
  fetchDetailWithRetry,
  getDetailFetchMethod,
} = require("../core/pipeline/runMarketSource");

test("EstateCV uses headless catalogue fetches but plain HTTP detail fetches", () => {
  const config = loadSourcesConfig("cv");
  assert.equal(config.success, true, config.error);

  const source = config.data.sources.find((candidate) => candidate.id === "cv_estatecv");
  assert.equal(source.fetch_method, "headless");
  assert.equal(getDetailFetchMethod(source), "http");
});

test("EstateCV retries one transient detail fetch failure", async () => {
  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    if (attempts === 1) {
      return { success: false, error: "temporary browser failure" };
    }
    return { success: true, statusCode: 200, html: "<html>ok</html>" };
  };

  const result = await fetchDetailWithRetry(
    "cv_estatecv",
    "https://estatecv.com/en/properties/lands/example",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 2);
  assert.equal(result.success, true);
  assert.equal(result.retried, true);
});

test("NhaKaza retries one transient detail fetch failure", async () => {
  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    if (attempts === 1) {
      return { success: false, error: "temporary connection reset" };
    }
    return { success: true, statusCode: 200, html: "<html>ok</html>" };
  };

  const result = await fetchDetailWithRetry(
    "cv_nhakaza",
    "https://nhakaza.cv/comprar-apartamento/example",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 2);
  assert.equal(result.success, true);
  assert.equal(result.retried, true);
});

test("other sources do not receive source-specific detail retries", async () => {
  let attempts = 0;
  const fetchFn = async () => {
    attempts++;
    return { success: false, error: "failed" };
  };

  const result = await fetchDetailWithRetry(
    "cv_oceanproperty24",
    "https://example.com/listing",
    fetchFn,
    async () => {},
  );

  assert.equal(attempts, 1);
  assert.equal(result.success, false);
  assert.equal(result.retried, false);
});
