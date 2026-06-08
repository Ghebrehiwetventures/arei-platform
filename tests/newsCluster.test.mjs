import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCanonicalUrl,
  titleTokens,
  jaccard,
  extractNumbers,
  clusterArticles,
} from "../arei-admin/lib/news-cluster.js";

test("normalizeCanonicalUrl collapses tracking variants to one key", () => {
  const a = normalizeCanonicalUrl("https://www.site.com/a/b/?utm_source=x&fbclid=9#sec");
  const b = normalizeCanonicalUrl("http://site.com/a/b");
  assert.equal(a, b);
  assert.equal(normalizeCanonicalUrl("not a url"), null);
});

test("titleTokens drops Cape Verde + stopwords, keeps discriminating words", () => {
  const t = titleTokens("Cabo Verde Airlines Restarts Direct Flights to Recife");
  assert.ok(t.includes("recife"));
  assert.ok(t.includes("airlines"));
  assert.ok(!t.includes("cabo") && !t.includes("verde") && !t.includes("to"));
});

test("extractNumbers captures figures and 5G", () => {
  const n = extractNumbers("VINCI secures €120 million for airports; 5G pilot in 2026");
  assert.ok(n.includes("120eur") || n.includes("120million") || n.some((x) => x.startsWith("120")));
  assert.ok(n.includes("5g"));
});

test("clusters the same story across sources, keeps different stories apart", () => {
  // Realistic shape: enrichment provides topics (signal_tags) + entities
  // (affected_regions), which boost a borderline title match into a merge.
  const articles = [
    { id: "a1", title: "Cabo Verde Airlines Restarts Direct Flights to Recife", countryCode: "CV", publishedAt: "2026-04-20", topics: ["air connectivity", "tourism demand"], entities: ["recife"] },
    { id: "a2", title: "Cape Verde resumes direct Praia–Recife flights", countryCode: "CV", publishedAt: "2026-04-21", topics: ["air connectivity", "tourism demand"], entities: ["recife", "praia"] },
    { id: "a3", title: "Cabo Verde Airlines Expands European Routes with New Aircraft", countryCode: "CV", publishedAt: "2026-04-21", topics: ["air connectivity", "tourism demand", "foreign investment"], entities: ["europe"] },
    { id: "a4", title: "All-inclusive holiday to Boa Vista costs €977 per person", countryCode: "CV", publishedAt: "2026-05-17", topics: ["tourism demand", "vacation packages"], entities: ["boa vista"] },
  ];
  const clusters = clusterArticles(articles);
  const byArticle = {};
  clusters.forEach((c, i) => c.members.forEach((m) => { byArticle[m.articleId] = i; }));
  assert.equal(byArticle.a1, byArticle.a2, "Recife flight story should cluster together");
  assert.notEqual(byArticle.a1, byArticle.a3, "European routes is a different story");
  assert.notEqual(byArticle.a1, byArticle.a4, "Boa Vista holiday is a different story");
});

test("exact canonical_url dedups into one cluster regardless of title", () => {
  const url = "https://news.example.com/cv/airport-deal";
  const clusters = clusterArticles([
    { id: "x1", title: "Airport deal signed", countryCode: "CV", publishedAt: "2026-01-01", canonicalUrl: url },
    { id: "x2", title: "Completely different words here", countryCode: "CV", publishedAt: "2026-03-01", canonicalUrl: url + "/?utm_source=fb" },
  ]);
  assert.equal(clusters.length, 1, "same canonical URL must collapse to one cluster");
  const link = clusters[0].members.find((m) => m.articleId === "x2");
  assert.equal(link.method, "canonical_url");
});

test("does not merge across different countries", () => {
  const clusters = clusterArticles([
    { id: "c1", title: "Airline restarts Recife flights", countryCode: "CV", publishedAt: "2026-04-20" },
    { id: "c2", title: "Airline restarts Recife flights", countryCode: "NG", publishedAt: "2026-04-20" },
  ]);
  assert.equal(clusters.length, 2);
});
