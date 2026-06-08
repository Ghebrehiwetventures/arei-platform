/**
 * news-cluster.js — clustering engine for the Africa Real Estate News product
 * (Stage 3 of docs/03-product/africa-real-estate-news-cluster-architecture.md).
 *
 * Groups MANY source articles about the SAME real-world event into one story
 * cluster (Google-News style). Conservative by design: a false merge is worse
 * than leaving two clusters separate for review (per the doc).
 *
 * Pure functions — no DB, no network — so they are unit-testable. The endpoint
 * api/cluster-news.js wires these to Supabase. (A TypeScript twin of the URL
 * normaliser lives in scripts/lib/news-cluster.ts for the ingest side; the
 * Vercel build boundary keeps the runtime copy here in JS, mirroring how the
 * enrichment prompts are duplicated.)
 */

// Cape Verde appears in nearly every article here, so its name carries no
// discriminating signal between stories — treat as stopwords. Same for generic
// news verbs/words that don't identify the specific event.
const STOPWORDS = new Set([
  "cape", "verde", "cabo", "the", "a", "an", "and", "or", "of", "to", "in", "on",
  "for", "with", "at", "by", "from", "as", "is", "are", "new", "news", "after",
  "amid", "over", "into", "out", "up", "its", "it", "this", "that", "will",
  "be", "has", "have", "had", "more", "than", "set", "says", "said", "report",
  "reports", "first", "two", "year", "years", "cv",
]);

const TRACKING_PARAM = /^(utm_|mc_|hsa_|pk_|piwik_|matomo_|_hs)/i;
const TRACKING_PARAM_EXACT = new Set([
  "fbclid", "gclid", "dclid", "gclsrc", "wbraid", "gbraid", "msclkid",
  "igshid", "igsh", "ref", "ref_src", "ref_url", "source", "cmpid", "spm",
  "yclid", "twclid", "li_fat_id", "s_cid", "ncid", "amp", "guccounter",
]);

/** Normalize an article URL into a stable dedup key (see scripts/lib twin). */
export function normalizeCanonicalUrl(rawUrl) {
  const input = String(rawUrl || "").trim();
  if (!input) return null;
  let u;
  try { u = new URL(input); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  u.hash = "";
  if (u.port === "80" || u.port === "443") u.port = "";
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  const kept = [];
  for (const [k, v] of u.searchParams.entries()) {
    if (TRACKING_PARAM.test(k) || TRACKING_PARAM_EXACT.has(k.toLowerCase())) continue;
    kept.push([k, v]);
  }
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);
  return u.toString();
}

/** Significant, discriminating title tokens (lowercased, stopwords removed). */
export function titleTokens(title) {
  const words = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

/** Concrete numbers/figures in text — a strong "same story" signal. */
export function extractNumbers(text) {
  const out = new Set();
  const re = /\b(\d+(?:[.,]\d+)?)\s?(million|billion|bn|m|%|percent|euros?|eur|usd|dollars?)?\b|\b(\d[gG])\b/g;
  let m;
  while ((m = re.exec(String(text || ""))) !== null) {
    if (m[3]) { out.add(m[3].toLowerCase()); continue; } // e.g. "5g"
    const num = m[1].replace(/,/g, "");
    const unit = (m[2] || "").toLowerCase().replace("percent", "%").replace("euros", "eur").replace("euro", "eur").replace("dollars", "usd").replace("dollar", "usd");
    out.add(unit ? `${num}${unit}` : num);
  }
  return Array.from(out);
}

/** Jaccard similarity of two token arrays. */
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function sharedCount(a, b) {
  const B = new Set((b || []).map((x) => String(x).toLowerCase()));
  let n = 0;
  for (const x of new Set((a || []).map((y) => String(y).toLowerCase()))) if (B.has(x)) n++;
  return n;
}

function withinDays(aIso, bIso, days) {
  const a = Date.parse(aIso), b = Date.parse(bIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return true; // unknown dates don't block
  return Math.abs(a - b) <= days * 86400000;
}

/**
 * Conservatively cluster articles into stories. Each article:
 * { id, title, snippet?, canonicalUrl?, resolvedUrl?, countryCode?, publishedAt?,
 *   topics?: string[], entities?: string[] }
 * Returns clusters: { members: [{ articleId, method, score, isPrimary }],
 *   country, topics, entities, firstPublishedAt, latestPublishedAt }.
 */
export function clusterArticles(articles, opts = {}) {
  const SIM = opts.simThreshold ?? 0.45;       // title-driven merge threshold
  const WINDOW = opts.windowDays ?? 7;         // same-story date window
  const clusters = [];

  const sorted = [...(articles || [])].sort((a, b) =>
    String(a.publishedAt || "").localeCompare(String(b.publishedAt || ""))
  );

  for (const art of sorted) {
    const canon = art.canonicalUrl ? normalizeCanonicalUrl(art.canonicalUrl) : null;
    const resolved = art.resolvedUrl ? normalizeCanonicalUrl(art.resolvedUrl) : null;
    const tokens = titleTokens(art.title);
    const numbers = extractNumbers(`${art.title || ""} ${art.snippet || ""}`);
    const topics = (art.topics || []).map((t) => String(t).toLowerCase());
    const entities = (art.entities || []).map((e) => String(e).toLowerCase());

    let best = null; // { cluster, method, score }
    for (const c of clusters) {
      // Country gate: only merge within the same country (unknown is allowed).
      if (art.countryCode && c.country && art.countryCode !== c.country) continue;

      // 1) exact URL dedup (highest confidence, ignores window)
      if (canon && c.canonicalUrls.has(canon)) { best = { cluster: c, method: "canonical_url", score: 1 }; break; }
      if (resolved && c.resolvedUrls.has(resolved)) { best = { cluster: c, method: "resolved_url", score: 0.99 }; break; }

      // 2) date window
      if (!withinDays(art.publishedAt, c.latestPublishedAt, WINDOW) &&
          !withinDays(art.publishedAt, c.firstPublishedAt, WINDOW)) continue;

      // 3) lexical score, boosted by shared numbers / entities / topics
      const sim = jaccard(tokens, c.tokens);
      const score =
        sim +
        0.12 * Math.min(sharedCount(numbers, c.numbers), 2) +
        0.08 * Math.min(sharedCount(entities, c.entities), 3) +
        0.05 * Math.min(sharedCount(topics, c.topics), 3);
      if (score >= SIM && (!best || score > best.score)) {
        best = { cluster: c, method: "title_similarity", score: Math.min(score, 0.98) };
      }
    }

    if (best) {
      const c = best.cluster;
      c.members.push({ articleId: art.id, method: best.method, score: best.score, isPrimary: false });
      if (canon) c.canonicalUrls.add(canon);
      if (resolved) c.resolvedUrls.add(resolved);
      c.tokens = Array.from(new Set([...c.tokens, ...tokens]));
      c.numbers = Array.from(new Set([...c.numbers, ...numbers]));
      c.topics = Array.from(new Set([...c.topics, ...topics]));
      c.entities = Array.from(new Set([...c.entities, ...entities]));
      if (art.publishedAt) {
        if (!c.firstPublishedAt || art.publishedAt < c.firstPublishedAt) c.firstPublishedAt = art.publishedAt;
        if (!c.latestPublishedAt || art.publishedAt > c.latestPublishedAt) c.latestPublishedAt = art.publishedAt;
      }
    } else {
      clusters.push({
        members: [{ articleId: art.id, method: "seed", score: 1, isPrimary: false }],
        country: art.countryCode || null,
        canonicalUrls: new Set(canon ? [canon] : []),
        resolvedUrls: new Set(resolved ? [resolved] : []),
        tokens, numbers, topics, entities,
        firstPublishedAt: art.publishedAt || null,
        latestPublishedAt: art.publishedAt || null,
      });
    }
  }

  // Confidence = min member score; mark a primary source (most recent member).
  return clusters.map((c) => {
    const conf = c.members.reduce((min, m) => Math.min(min, m.score), 1);
    return {
      members: c.members,
      country: c.country,
      topics: c.topics,
      entities: c.entities,
      firstPublishedAt: c.firstPublishedAt,
      latestPublishedAt: c.latestPublishedAt,
      sourceCount: c.members.length,
      clusterConfidence: Number(conf.toFixed(3)),
    };
  });
}
