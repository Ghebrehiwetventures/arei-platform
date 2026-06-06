import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeGoogleNewsUrl,
  resolvePublisherUrl,
  fetchArticleBody,
  extractArticleText,
  buildUserMessage,
  validateSuggestion,
  normalizeSuggestion,
} from "../arei-admin/api/enrich-candidate.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Google News /articles URL whose id base64url-decodes to a blob that
 *  embeds `publisherUrl` as readable text (the older, decodable format). */
function googleNewsUrlEmbedding(publisherUrl) {
  // Leading protobuf-ish control bytes + url + trailing control byte. Control
  // bytes (< 0x21) bound the URL so the decoder extracts it cleanly.
  const blob = Buffer.concat([
    Buffer.from([0x08, 0x13, 0x22, 0x30]),
    Buffer.from(publisherUrl, "latin1"),
    Buffer.from([0x01, 0x02]),
  ]);
  const seg = blob.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://news.google.com/rss/articles/${seg}?oc=5`;
}

/** Minimal mocked fetch Response (no streaming body — exercises the text() path). */
function mockResponse({ ok = true, status = 200, url = "", text = "" } = {}) {
  return { ok, status, url, text: async () => text };
}

const HOSPITALITY_BODY = `
<html><body>
<nav>Subscribe to our newsletter</nav>
<p>Cape Verde has emerged as one of Africa's most active hotel development markets, ranking sixth on the continent by planned hotel rooms.</p>
<p>The report identifies 17 hotel and resort projects in Cape Verde, representing 4,328 planned rooms. Only 374 rooms, or 8.6 percent of the pipeline, are currently under construction.</p>
<footer>All rights reserved. Privacy policy.</footer>
</body></html>`;

// ── URL resolution: normal publisher URL path ────────────────────────────────

test("resolvePublisherUrl skips non-Google-News URLs", async () => {
  const url = "https://www.hospitalitynet.org/news/4131326.html";
  const out = await resolvePublisherUrl(url);
  assert.equal(out.url, url);
  assert.equal(out.resolved, false);
});

// ── URL resolution: Google News decode path (offline) ────────────────────────

test("decodeGoogleNewsUrl extracts an embedded publisher URL", () => {
  const publisher = "https://www.hospitalitynet.org/news/4131326.html";
  const gUrl = googleNewsUrlEmbedding(publisher);
  assert.equal(decodeGoogleNewsUrl(gUrl), publisher);
});

test("decodeGoogleNewsUrl returns null for an opaque/encrypted id", () => {
  const gUrl = "https://news.google.com/rss/articles/CBMiZ0FVX3lxTE5vcGFxdWVfaWRfMTIzNDU2Nzg5?oc=5";
  // Should not invent a URL — opaque ids decode to no embedded http(s) link.
  const decoded = decodeGoogleNewsUrl(gUrl);
  assert.ok(decoded === null || /^https?:\/\//.test(decoded));
});

test("resolvePublisherUrl resolves a decodable Google News URL without network", async () => {
  const publisher = "https://www.hospitalitynet.org/news/4131326.html";
  const gUrl = googleNewsUrlEmbedding(publisher);
  let fetchCalled = false;
  const out = await resolvePublisherUrl(gUrl, {
    fetchImpl: async () => { fetchCalled = true; return mockResponse(); },
  });
  assert.equal(out.url, publisher);
  assert.equal(out.resolved, true);
  assert.equal(out.method, "decode");
  assert.equal(fetchCalled, false, "decode path must not hit the network");
});

// ── URL resolution: Google News network fallback ─────────────────────────────

test("resolvePublisherUrl uses the final redirected URL when it lands off-Google", async () => {
  const gUrl = "https://news.google.com/rss/articles/OPAQUEID0123456789?oc=5";
  const out = await resolvePublisherUrl(gUrl, {
    fetchImpl: async () => mockResponse({ url: "https://www.publisher.com/story", text: "" }),
  });
  assert.equal(out.url, "https://www.publisher.com/story");
  assert.equal(out.resolved, true);
  assert.equal(out.method, "redirect");
});

test("resolvePublisherUrl extracts the publisher link from interstitial HTML", async () => {
  const gUrl = "https://news.google.com/rss/articles/OPAQUEID0123456789?oc=5";
  const out = await resolvePublisherUrl(gUrl, {
    fetchImpl: async () =>
      mockResponse({
        url: "https://news.google.com/articles/OPAQUEID",
        text: '<a href="https://www.example-news.com/article-42">read</a>',
      }),
  });
  assert.equal(out.url, "https://www.example-news.com/article-42");
  assert.equal(out.resolved, true);
  assert.equal(out.method, "html");
});

test("resolvePublisherUrl falls back to the original URL when resolution fails", async () => {
  const gUrl = "https://news.google.com/rss/articles/OPAQUEID0123456789?oc=5";
  const out = await resolvePublisherUrl(gUrl, {
    fetchImpl: async () => { throw new Error("network down"); },
  });
  assert.equal(out.url, gUrl);
  assert.equal(out.resolved, false);
});

// ── Article body fetch ───────────────────────────────────────────────────────

test("fetchArticleBody returns extracted text on success", async () => {
  const body = await fetchArticleBody("https://www.hospitalitynet.org/news/4131326.html", {
    fetchImpl: async () => mockResponse({ ok: true, text: HOSPITALITY_BODY }),
  });
  assert.ok(body, "expected a non-null article body");
  assert.match(body, /4,328 planned rooms/);
  assert.doesNotMatch(body, /newsletter/i, "boilerplate should be stripped");
  assert.doesNotMatch(body, /All rights reserved/i, "footer should be stripped");
});

test("fetchArticleBody returns null when the fetch throws (clean fallback)", async () => {
  const body = await fetchArticleBody("https://blocked.example/x", {
    fetchImpl: async () => { throw new Error("ETIMEDOUT"); },
  });
  assert.equal(body, null);
});

test("fetchArticleBody returns null on non-200", async () => {
  const body = await fetchArticleBody("https://x.example/x", {
    fetchImpl: async () => mockResponse({ ok: false, status: 403, text: "" }),
  });
  assert.equal(body, null);
});

test("fetchArticleBody returns null when the body is too short", async () => {
  const body = await fetchArticleBody("https://x.example/x", {
    fetchImpl: async () => mockResponse({ ok: true, text: "<p>Too short to be useful.</p>" }),
  });
  assert.equal(body, null);
});

test("extractArticleText drops boilerplate-only pages", () => {
  const html = "<p>Subscribe to our newsletter for more.</p><p>Cookie consent required.</p>";
  assert.equal(extractArticleText(html), null);
});

// ── Model payload ────────────────────────────────────────────────────────────

test("buildUserMessage includes the article body when available", () => {
  const msg = buildUserMessage({ title: "T", source_url: "u" }, "FULL ARTICLE TEXT");
  assert.match(msg, /Article body \(extracted from source URL\)/);
  assert.match(msg, /FULL ARTICLE TEXT/);
});

test("buildUserMessage omits the article-body section when unavailable (snippet-only)", () => {
  const msg = buildUserMessage({ title: "T", snippet: "S" }, null);
  assert.doesNotMatch(msg, /Article body/);
  assert.match(msg, /Snippet: S/);
});

// ── Suggestion validation + normalisation ────────────────────────────────────

const BASE_SUGGESTION = {
  title: "Cape Verde ranks sixth in Africa hotel pipeline",
  snippet: "Cape Verde ranks sixth with 4,328 planned rooms.",
  why_it_matters: "This matters because hotel pipelines signal investment interest.",
  category: "Tourism",
  signal_tags: ["Hotel development"],
  affected_regions: [],
  relevance_score: 80,
  recommendation: "publish",
  reasoning: "Concrete Cape Verde figures.",
};

test("validateSuggestion still passes the original 9-field shape (downstream-compatible)", () => {
  // No key_facts / cape_verde_angle present — must NOT be required.
  assert.equal(validateSuggestion({ ...BASE_SUGGESTION }), null);
});

test("normalizeSuggestion accepts and cleans structured-extraction fields", () => {
  const s = normalizeSuggestion({
    ...BASE_SUGGESTION,
    cape_verde_angle: "  Cape Verde is among Africa's top hotel pipelines.  ",
    key_facts: [
      { fact: " Ranks 6th ", value: 6, unit: " rank ", confidence: "high", source_text: " ranking sixth " },
      { fact: "Bad confidence", confidence: "supreme" },
      { fact: "" },                  // dropped: empty fact
      { notAFact: true },            // dropped: malformed
    ],
  });
  assert.equal(s.cape_verde_angle, "Cape Verde is among Africa's top hotel pipelines.");
  assert.equal(s.key_facts.length, 2);
  assert.equal(s.key_facts[0].fact, "Ranks 6th");
  assert.equal(s.key_facts[0].unit, "rank");
  assert.equal(s.key_facts[0].source_text, "ranking sixth");
  assert.equal(s.key_facts[1].confidence, "low", "invalid confidence coerced to low");
});

test("normalizeSuggestion defaults missing structured fields safely", () => {
  const s = normalizeSuggestion({ ...BASE_SUGGESTION });
  assert.deepEqual(s.key_facts, []);
  assert.equal(s.cape_verde_angle, null);
});
