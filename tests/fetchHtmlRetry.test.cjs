const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { fetchHtml } = require("../core/fetchHtml");

function makeResponse({ status = 200, statusText = "OK", body = "", headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get: (name) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
    text: async () => body,
  };
}

function installFetchMock(impl) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return impl(calls.length, url, init);
  };
  return {
    calls,
    restore() {
      global.fetch = original;
    },
  };
}

test("fetchHtml retries on 503 and succeeds on second attempt", async () => {
  const mock = installFetchMock((n) => {
    if (n === 1) return makeResponse({ status: 503, statusText: "Service Unavailable", headers: { "retry-after": "0" } });
    return makeResponse({ status: 200, body: "<html>ok</html>" });
  });
  try {
    const result = await fetchHtml("https://example.test/page", { retries: 2 });
    assert.equal(result.success, true);
    assert.equal(result.html, "<html>ok</html>");
    assert.equal(result.statusCode, 200);
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("fetchHtml returns failure after exhausting retries on persistent 429", async () => {
  const mock = installFetchMock(() => makeResponse({ status: 429, statusText: "Too Many Requests", headers: { "retry-after": "0" } }));
  try {
    const result = await fetchHtml("https://example.test/page", { retries: 2 });
    assert.equal(result.success, false);
    assert.equal(result.statusCode, 429);
    assert.equal(mock.calls.length, 3);
  } finally {
    mock.restore();
  }
});

test("fetchHtml does not retry non-retryable 404", async () => {
  const mock = installFetchMock(() => makeResponse({ status: 404, statusText: "Not Found" }));
  try {
    const result = await fetchHtml("https://example.test/missing", { retries: 2 });
    assert.equal(result.success, false);
    assert.equal(result.statusCode, 404);
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});

test("fetchHtml retries on network error and succeeds", async () => {
  const mock = installFetchMock((n) => {
    if (n === 1) throw new TypeError("fetch failed");
    return makeResponse({ status: 200, body: "<html>ok</html>" });
  });
  try {
    const result = await fetchHtml("https://example.test/page", { retries: 2 });
    assert.equal(result.success, true);
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("fetchHtml honors retries:0 (no retry attempts)", async () => {
  const mock = installFetchMock(() => makeResponse({ status: 503, statusText: "Service Unavailable", headers: { "retry-after": "0" } }));
  try {
    const result = await fetchHtml("https://example.test/page", { retries: 0 });
    assert.equal(result.success, false);
    assert.equal(result.statusCode, 503);
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});
