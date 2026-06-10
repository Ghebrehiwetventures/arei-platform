import React, { useEffect, useState } from "react";
import { fetchMarketNewsSocialState, type MarketNewsItem } from "./socialMarketNews";
import { supabaseAuth } from "./supabase";

const CATEGORIES = ["Aviation", "Real Estate", "Tourism", "Policy", "Infrastructure", "Market News"];

const inputCls = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

// First complete sentence — avoids the mid-word truncation of a raw char slice.
function firstSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim();
}

// Auto-suggest the sage highlight: the back half of the headline carries the
// news (the subject/outcome). Matches how a human picks it ~most of the time.
function suggestHighlight(headline: string): string {
  const w = (headline || "").trim().split(/\s+/).filter(Boolean);
  if (w.length < 4) return "";
  return w.slice(Math.floor(w.length / 2)).join(" ");
}

type ImageSource = "ai" | "pexels" | "url" | "upload";

// Add/replace a single photo-credit line in the caption. Used when a Pexels
// photo is chosen so the photographer is credited in the caption (not on the
// image). Idempotent across re-generates / shuffles: removes any prior credit
// line first, so a new photographer replaces the old one without duplicating.
function applyPhotoCredit(caption: string, credit: string): string {
  const stripped = caption
    .split("\n")
    .filter((l) => !/^\s*Photo:\s.*\/\sPexels\s*$/i.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  if (!credit) return stripped;
  // Insert the credit just before the hashtags block (last paragraph), else append.
  const paras = stripped.split("\n\n");
  const lastIsTags = paras.length > 1 && /(^|\s)#\w/.test(paras[paras.length - 1]);
  if (lastIsTags) {
    paras.splice(paras.length - 1, 0, credit);
    return paras.join("\n\n");
  }
  return `${stripped}\n\n${credit}`;
}

// Instagram caption = the news, summarised: headline + the aggregated
// what-happened summary + source + hashtags. No "why it matters" analysis
// (that explainer tone is unwanted on Instagram), no "link in bio", no "AI
// illustration" note.
function buildCaption(item: MarketNewsItem): string {
  const tags = ["#capeverde", "#caboverde", "#realestate", "#marketnews", "#" + (item.category || "").toLowerCase().replace(/[^a-z]/g, "")]
    .filter((t) => t.length > 1);
  const parts: string[] = [];
  if (item.sourceTitle?.trim()) parts.push(item.sourceTitle.trim());
  if (item.whatHappened?.trim()) parts.push(item.whatHappened.trim());
  if (item.sourceName?.trim()) parts.push(`Source: ${item.sourceName.trim()}`);
  parts.push(tags.join(" "));
  return parts.join("\n\n");
}

// Downscale an uploaded image in the browser before sending it as a data: URL.
// Vercel caps the request body at ~4.5 MB; a raw high-res PNG (base64 inflated
// ~33%) easily exceeds it → 413. The hero only renders ~1080px wide, so a
// max-1920px JPEG is plenty and stays well under the limit.
function downscaleImageToDataUrl(file: File, maxDim = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

interface GenerateResponse {
  slides: { label: string; imageBase64: string }[];
  mime: string;
  caption: string;
  promptUsed: string | null;
  warning: string | null;
  attribution?: string | null;
  photoMeta?: {
    photo_provider: string;
    photo_author: string;
    photo_author_url: string;
    photo_source_url: string;
    photo_attribution_text: string;
  } | null;
}

export function NewsPostStudioView() {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editable form fields
  const [category, setCategory] = useState("Market News");
  const [headline, setHeadline] = useState("");
  const [highlight, setHighlight] = useState("");
  const [date, setDate] = useState("");
  const [dek, setDek] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource>("ai");
  const [quality, setQuality] = useState("high");
  const [basePrompt, setBasePrompt] = useState("");
  const [tweakNote, setTweakNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [articleBodyUsed, setArticleBodyUsed] = useState<boolean | null>(null);
  const [richerSibling, setRicherSibling] = useState<MarketNewsItem | null>(null);
  const [richerSourceCount, setRicherSourceCount] = useState(0);
  const [dateWarning, setDateWarning] = useState(false);
  const [region, setRegion] = useState("");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Item-list filter / search / sort
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sortBy, setSortBy] = useState("relevant");

  // Caption (editable) + Instagram publish state
  const [captionText, setCaptionText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ permalink: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // One-time backfill: re-enrich rows enriched before the richer-summary prompt.
  const [reenriching, setReenriching] = useState(false);
  const [reenrichMsg, setReenrichMsg] = useState("");
  const [clustering, setClustering] = useState(false);
  const [clusterMsg, setClusterMsg] = useState("");

  useEffect(() => {
    fetchMarketNewsSocialState()
      .then((s) => setItems(s.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingItems(false));
  }, []);

  function selectItem(item: MarketNewsItem) {
    const title = item.sourceTitle || "";
    setSelectedId(item.id);
    setHeadline(title);
    setCategory(CATEGORIES.includes(item.category) ? item.category : "Market News");
    setDek(firstSentence(item.whatHappened || ""));
    setDate(formatDate(item.publishedAt));
    setHighlight(suggestHighlight(title));
    setSourceUrl(item.sourceUrl || "");
    setSourceName(item.sourceName || "");
    setArticleBodyUsed(item.articleBodyUsed ?? null);
    setRegion(item.region || "");
    setCaptionText(buildCaption(item));
    setResult(null);
    setError(null);
    setPublished(null);
    setPublishError(null);
    // Guard: suspiciously old published date (e.g. a 2017 date on 2026 news).
    const y = item.publishedAt ? new Date(item.publishedAt).getFullYear() : NaN;
    setDateWarning(Number.isFinite(y) && y < new Date().getFullYear() - 1);
    // Väg A: if this item is thin, look for a richer open sibling in its cluster.
    setRicherSibling(null);
    setRicherSourceCount(0);
    if (item.articleBodyUsed !== true) loadRicherSibling(item.id);
  }

  // Fetch a richer open-source sibling for a thin item (same story cluster).
  async function loadRicherSibling(itemId: string) {
    try {
      const res = await fetch(`/api/richer-sibling?id=${encodeURIComponent(itemId)}`, {
        credentials: "include",
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return; // silent — it's an optional enhancement
      // Ignore if the user has since selected another item.
      setSelectedId((cur) => {
        if (cur === itemId) {
          setRicherSibling(data.sibling || null);
          setRicherSourceCount(data.sourceCount || 0);
        }
        return cur;
      });
    } catch {
      /* optional — ignore */
    }
  }

  // opts.aiPromptOverride re-runs AI image generation with a specific prompt
  // (used by "Tweak" to get fresh variants of a liked image). opts.isTweak keeps
  // the original base prompt stable across repeated tweaks.
  async function generate(opts?: { aiPromptOverride?: string; isTweak?: boolean }) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-news-post-image", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        // useAi is true for AI and for Pexels (Pexels falls back to AI when no
        // usable photo is found). URL/upload sources use the imageUrl directly.
        body: JSON.stringify({
          category, headline, highlight, date, dek,
          useAi: opts?.aiPromptOverride ? true : imageSource === "ai" || imageSource === "pexels",
          quality, imageUrl, location: region,
          imageSource: opts?.aiPromptOverride ? "ai" : imageSource,
          aiPrompt: opts?.aiPromptOverride || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const result = data as GenerateResponse;
      setResult(result);
      // Remember the first AI prompt as the stable base for tweaks.
      if (!opts?.isTweak && result.promptUsed) setBasePrompt(result.promptUsed);
      // Keep the full client-built caption; only add the photographer credit to
      // the caption (not the image) when a Pexels photo was used.
      setCaptionText((c) => applyPhotoCredit(c, result.photoMeta?.photo_attribution_text || ""));
      setPublished(null);
      setPublishError(null);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setGenerating(false);
    }
  }

  // Generate a fresh variant of the current AI image: same subject/style, new
  // take. Optionally steered by a short note ("more flag, dusk light").
  function tweak() {
    const base = (basePrompt || result?.promptUsed || "").trim();
    if (!base) return;
    const note = tweakNote.trim();
    const prompt = note
      ? `${base} Variation, keeping the same subject and style: ${note}.`
      : `${base} Produce a fresh variation — alternate composition, camera angle and lighting — keeping the same subject and style.`;
    generate({ aiPromptOverride: prompt, isTweak: true });
  }

  // Loop the re-enrich endpoint (with the Studio's Supabase auth) until the
  // backfill reports done. Opening the endpoint URL directly fails because a
  // browser navigation sends no auth header — this button sends it.
  async function runReenrichBackfill() {
    if (reenriching) return;
    setReenriching(true);
    setReenrichMsg("Starting…");
    try {
      let done = false;
      let total = 0;
      let guard = 0;
      while (!done && guard < 100) {
        guard++;
        const res = await fetch("/api/reenrich-market-news?limit=6", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        total += data.processed || 0;
        done = Boolean(data.done);
        setReenrichMsg(`Re-enriched ${total}… ${data.remaining ?? "?"} remaining`);
      }
      setReenrichMsg(
        done
          ? `Done — re-enriched ${total} items. Re-pick an item to see the fuller caption.`
          : `Paused after ${total}. Click again to continue.`
      );
    } catch (e: any) {
      setReenrichMsg(`Error: ${e.message || String(e)}`);
    } finally {
      setReenriching(false);
    }
  }

  // Run the news clustering engine over enriched market_news and report stats.
  async function runClustering() {
    if (clustering) return;
    setClustering(true);
    setClusterMsg("Clustering…");
    try {
      const res = await fetch("/api/cluster-news", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setClusterMsg(
        `${data.clusters} clusters from ${data.articles} articles · ${data.multiSourceClusters} multi-source · ${data.duplicatesGrouped} duplicates grouped`
      );
    } catch (e: any) {
      setClusterMsg(`Error: ${e.message || String(e)}`);
    } finally {
      setClustering(false);
    }
  }

  async function publish() {
    if (!result?.slides?.length) return;
    if (!window.confirm("Publish this post to Instagram now? It goes live immediately.")) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/publish-news-post", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ images: result.slides.map((s) => s.imageBase64), caption: captionText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Publish failed (${res.status})`);
      setPublished({ permalink: data.permalink || "" });
    } catch (e: any) {
      setPublishError(e.message || String(e));
    } finally {
      setPublishing(false);
    }
  }

  const categoryOptions = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();
  const filteredItems = items
    .filter((i) => (!catFilter || i.category === catFilter) &&
      (!search || (i.sourceTitle || "").toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "relevant") {
        const ra = a.relevanceScore ?? -1;
        const rb = b.relevanceScore ?? -1;
        if (rb !== ra) return rb - ra;
        // tie-break by recency
        return (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0);
      }
      const ta = new Date(a.publishedAt).getTime() || 0;
      const tb = new Date(b.publishedAt).getTime() || 0;
      return sortBy === "oldest" ? ta - tb : tb - ta;
    });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-mono font-semibold tracking-wide">News Post Studio</h1>
        <p className="text-xs text-foreground-muted mt-1">
          Generate a branded Instagram hero from a market-news item. AI image is built from the
          headline (high quality ≈ $0.25/image).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_minmax(0,420px)] gap-5">
        {/* ── Item picker ─────────────────────────────── */}
        <div className="border border-border rounded">
          <div className="px-3 py-2 border-b border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle flex items-center justify-between">
            <span>Market news</span>
            <span className="text-foreground-muted normal-case tracking-normal">{filteredItems.length}</span>
          </div>
          {/* filter + sort + search */}
          <div className="p-2 border-b border-border space-y-2">
            <input
              className={inputCls + " text-xs"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search headlines…"
            />
            <div className="flex gap-2">
              <select className={inputCls + " text-xs"} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className={inputCls + " text-xs"} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="relevant">Most relevant</option>
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
          {/* One-time maintenance: re-enrich rows with the richer-summary prompt */}
          <div className="p-2 border-b border-border">
            <button
              onClick={runReenrichBackfill}
              disabled={reenriching}
              className="w-full px-2 py-1.5 rounded border border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle hover:bg-surface-2 disabled:opacity-50"
            >
              {reenriching ? "Re-enriching…" : "⟳ Backfill old captions"}
            </button>
            {reenrichMsg && <div className="mt-1 text-[10px] font-mono text-foreground-subtle">{reenrichMsg}</div>}
            <button
              onClick={runClustering}
              disabled={clustering}
              className="w-full mt-2 px-2 py-1.5 rounded border border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle hover:bg-surface-2 disabled:opacity-50"
            >
              {clustering ? "Clustering…" : "⟳ Rebuild news clusters"}
            </button>
            {clusterMsg && <div className="mt-1 text-[10px] font-mono text-foreground-subtle">{clusterMsg}</div>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingItems && <div className="p-3 text-xs text-foreground-muted">Loading…</div>}
            {!loadingItems && filteredItems.length === 0 && (
              <div className="p-3 text-xs text-foreground-muted">No matching items.</div>
            )}
            {filteredItems.map((it) => (
              <button
                key={it.id}
                onClick={() => selectItem(it)}
                className={`w-full text-left px-3 py-2 border-b border-border/60 transition-colors ${
                  selectedId === it.id ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  {it.relevanceScore != null && (
                    <span
                      className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        it.relevanceScore >= 70 ? "bg-emerald-100 text-emerald-700"
                          : it.relevanceScore >= 40 ? "bg-amber-100 text-amber-700"
                          : "bg-surface-3 text-foreground-subtle"
                      }`}
                      title="AI relevance score (0–100)"
                    >
                      {it.relevanceScore}
                    </span>
                  )}
                  <div className="text-xs font-medium leading-snug line-clamp-2">{it.sourceTitle}</div>
                </div>
                <div className="text-[10px] font-mono text-foreground-subtle mt-1">
                  {it.category} · {it.sourceName}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────── */}
        <div className="space-y-3">
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Headline">
            <textarea className={inputCls} rows={2} value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </Field>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block -mt-1 text-[11px] font-mono text-accent hover:underline truncate"
              title={sourceUrl}
            >
              View original article{sourceName ? ` · ${sourceName}` : ""} →
            </a>
          )}
          {selectedId && articleBodyUsed !== null && (
            <span
              className={`inline-block -mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide ${
                articleBodyUsed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
              title={
                articleBodyUsed
                  ? "Enrichment used the full article — caption can be rich."
                  : "Source gave snippet only (paywall / bot-block / JS) — caption is necessarily short. Not a bug."
              }
            >
              {articleBodyUsed ? "✓ Full article" : "Snippet only"}
            </span>
          )}
          {dateWarning && (
            <div className="text-[10px] font-mono text-amber-700" title="The published date looks far in the past for this news — verify it isn't a stale/mis-parsed date.">
              ⚠ Old published date — verify
            </div>
          )}
          {richerSibling && (
            <button
              onClick={() => selectItem(richerSibling)}
              className="block w-full text-left mt-1 px-2 py-1.5 rounded border border-accent/50 text-[11px] font-mono text-accent hover:bg-surface-2"
              title="Switch to a sibling article about the same story from an open source. Source link and the caption's attribution follow the article you switch to."
            >
              ↑ Richer version from {richerSibling.sourceName} · full article{richerSourceCount ? ` · ${richerSourceCount} sources` : ""} →
              <span className="block text-foreground-subtle normal-case truncate mt-0.5">{richerSibling.sourceTitle}</span>
            </button>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
                Highlight (phrase coloured sage)
              </div>
              <button
                type="button"
                onClick={() => setHighlight(suggestHighlight(headline))}
                className="text-[10px] font-mono text-accent hover:underline"
              >
                ↻ suggest
              </button>
            </div>
            <input className={inputCls} value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="e.g. Cabo Verde and Brazil" />
          </div>
          <Field label="Date">
            <input className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} placeholder="JUN 4, 2026" />
          </Field>
          <Field label="Dek (one supporting line)">
            <textarea className={inputCls} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} />
          </Field>
          <Field label="Image source">
            <select
              className={inputCls}
              value={imageSource}
              onChange={(e) => setImageSource(e.target.value as ImageSource)}
            >
              <option value="ai">AI image (generated)</option>
              <option value="pexels">Curated Cape Verde photo (library)</option>
              <option value="upload">Upload image</option>
              <option value="url">Image URL</option>
            </select>
          </Field>

          {imageSource === "pexels" && (
            <p className="text-[11px] font-mono text-foreground-subtle -mt-1">
              Shuffles a real, human-verified Cape Verde photo from the curated
              library (never the wrong country). While the library is empty it
              falls back to an AI image. Photographer credited in the caption.
            </p>
          )}

          {imageSource === "ai" && (
            <Field label="Quality">
              <select className={inputCls} value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="high">high (≈ $0.25)</option>
                <option value="medium">medium (≈ $0.06)</option>
                <option value="low">low (≈ $0.02)</option>
              </select>
            </Field>
          )}

          {imageSource === "url" && (
            <Field label="Image URL">
              <input className={inputCls} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </Field>
          )}

          {imageSource === "upload" && (
            <Field label="Upload image">
              <input
                type="file"
                accept="image/*"
                className={inputCls + " text-xs"}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) { setImageUrl(""); return; }
                  setError(null);
                  try {
                    // Downscale client-side so the upload stays under Vercel's body limit.
                    setImageUrl(await downscaleImageToDataUrl(f));
                  } catch {
                    setImageUrl("");
                    setError("Could not process that image — try a different file.");
                  }
                }}
              />
            </Field>
          )}

          <button
            onClick={generate}
            disabled={generating || !headline.trim()}
            className="w-full mt-2 px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate post →"}
          </button>
          {error && <div className="text-xs text-[#C44A3A] mt-1">{error}</div>}
        </div>

        {/* ── Preview ─────────────────────────────────── */}
        <div className="space-y-3">
          {result?.slides?.length ? (
            <>
              {result.slides.map((s, i) => {
                const src = `data:${result.mime};base64,${s.imageBase64}`;
                return (
                  <div key={i} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">{s.label}</div>
                    <img src={src} alt={s.label} className="w-full rounded-lg border border-border" />
                    <a
                      href={src}
                      download={`cvrei-news-${i + 1}.png`}
                      className="block text-center px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2"
                    >
                      ↓ Download slide {i + 1}
                    </a>
                  </div>
                );
              })}
              {result?.promptUsed && !result?.photoMeta && (
                <div className="space-y-1.5 rounded-lg border border-border p-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
                    Tweak — more variants of this image
                  </div>
                  <input
                    className={inputCls + " text-xs"}
                    value={tweakNote}
                    onChange={(e) => setTweakNote(e.target.value)}
                    placeholder="optional steer, e.g. more flag, dusk light"
                  />
                  <button
                    onClick={tweak}
                    disabled={generating}
                    className="w-full px-3 py-2 rounded border border-accent/50 text-accent text-xs font-mono hover:bg-surface-2 disabled:opacity-50"
                  >
                    {generating ? "Tweaking…" : "↻ Tweak (new variant)"}
                  </button>
                </div>
              )}
              {result?.warning && <div className="text-[11px] text-[#C44A3A]">{result.warning}</div>}
              {result?.photoMeta && (
                <div className="text-[11px] font-mono text-foreground-subtle">
                  {result.photoMeta.photo_attribution_text}
                  {result.photoMeta.photo_source_url && (
                    <> · <a href={result.photoMeta.photo_source_url} target="_blank" rel="noreferrer" className="underline">source →</a></>
                  )}
                </div>
              )}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">
                  Caption
                </div>
                <textarea
                  className={inputCls}
                  rows={8}
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                />
              </div>

              {/* ── Publish to Instagram ─────────────── */}
              {published ? (
                <div className="text-xs font-mono text-accent border border-accent/40 rounded p-3">
                  ✓ Published to Instagram.
                  {published.permalink && (
                    <> <a href={published.permalink} target="_blank" rel="noreferrer" className="underline">View post →</a></>
                  )}
                </div>
              ) : (
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="w-full px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : "Publish to Instagram"}
                </button>
              )}
              {publishError && <div className="text-xs text-[#C44A3A]">{publishError}</div>}

              {result?.promptUsed && (
                <details className="text-[11px] text-foreground-subtle">
                  <summary className="cursor-pointer font-mono">Image prompt used</summary>
                  <div className="mt-1 whitespace-pre-wrap">{result.promptUsed}</div>
                </details>
              )}
            </>
          ) : (
            <div className="border border-dashed border-border rounded-lg h-[60vh] flex items-center justify-center text-xs text-foreground-muted">
              Pick an item or fill the form, then Generate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">{label}</div>
      {children}
    </label>
  );
}
