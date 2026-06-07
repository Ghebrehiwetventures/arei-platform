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

// Full Instagram caption: the actual news (what happened + why it matters) +
// source attribution + hashtags. No "link in bio" (the site only has links)
// and no "AI illustration" note.
// Defensively strip explainer scaffolding ("This matters because", "Why it
// matters", "This is important because") from a line so the caption never reads
// like a beginner explainer — even for rows enriched before the prompt was
// fixed, or when the model ignored the instruction. Re-capitalises what's left.
function stripExplainerScaffold(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^\s*(this matters because|this is important because|why it matters)\s*[:,]?\s*/i, "");
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function buildCaption(item: MarketNewsItem): string {
  const tags = ["#capeverde", "#caboverde", "#realestate", "#marketnews", "#" + (item.category || "").toLowerCase().replace(/[^a-z]/g, "")]
    .filter((t) => t.length > 1);
  const parts: string[] = [];
  if (item.sourceTitle?.trim()) parts.push(item.sourceTitle.trim());
  // Lead with the aggregated news summary, then the market implication with any
  // "this matters" scaffolding removed.
  if (item.whatHappened?.trim()) parts.push(item.whatHappened.trim());
  if (item.whyItMatters?.trim()) {
    const why = stripExplainerScaffold(item.whyItMatters);
    if (why) parts.push(why);
  }
  if (item.sourceName?.trim()) parts.push(`Source: ${item.sourceName.trim()}`);
  parts.push(tags.join(" "));
  return parts.join("\n\n");
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
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [region, setRegion] = useState("");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Item-list filter / search / sort
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // Caption (editable) + Instagram publish state
  const [captionText, setCaptionText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ permalink: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

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
    setRegion(item.region || "");
    setCaptionText(buildCaption(item));
    setResult(null);
    setError(null);
    setPublished(null);
    setPublishError(null);
  }

  async function generate() {
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
          useAi: imageSource === "ai" || imageSource === "pexels",
          quality, imageUrl, imageSource, location: region,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const result = data as GenerateResponse;
      setResult(result);
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
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
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
                <div className="text-xs font-medium leading-snug line-clamp-2">{it.sourceTitle}</div>
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
              <option value="pexels">Pexels photo (real photography)</option>
              <option value="upload">Upload image</option>
              <option value="url">Image URL</option>
            </select>
          </Field>

          {imageSource === "pexels" && (
            <p className="text-[11px] font-mono text-foreground-subtle -mt-1">
              Real photo searched from the headline. Generate again for a
              different photo. Falls back to the AI image if no usable photo is
              found. Photographer credited in the caption.
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
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) { setImageUrl(""); return; }
                  const reader = new FileReader();
                  reader.onload = () => setImageUrl(typeof reader.result === "string" ? reader.result : "");
                  reader.readAsDataURL(f);
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
