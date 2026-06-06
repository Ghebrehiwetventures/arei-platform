import React, { useEffect, useMemo, useState } from "react";
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

interface GenerateResponse {
  imageBase64: string;
  mime: string;
  caption: string;
  promptUsed: string | null;
  warning: string | null;
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
  const [useAi, setUseAi] = useState(true);
  const [quality, setQuality] = useState("high");
  const [imageUrl, setImageUrl] = useState("");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setResult(null);
    setError(null);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-news-post-image", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ category, headline, highlight, date, dek, useAi, quality, imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data as GenerateResponse);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setGenerating(false);
    }
  }

  const imgSrc = useMemo(
    () => (result ? `data:${result.mime};base64,${result.imageBase64}` : null),
    [result]
  );

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
          <div className="px-3 py-2 border-b border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
            Market news
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loadingItems && <div className="p-3 text-xs text-foreground-muted">Loading…</div>}
            {!loadingItems && items.length === 0 && (
              <div className="p-3 text-xs text-foreground-muted">No items.</div>
            )}
            {items.map((it) => (
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

          <label className="flex items-center gap-2 text-xs font-mono mt-2">
            <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
            Generate AI image relevant to the headline
          </label>

          {useAi && (
            <Field label="Quality">
              <select className={inputCls} value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="high">high (≈ $0.25)</option>
                <option value="medium">medium (≈ $0.06)</option>
                <option value="low">low (≈ $0.02)</option>
              </select>
            </Field>
          )}
          {!useAi && (
            <Field label="Image URL (used when AI is off)">
              <input className={inputCls} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
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
          {imgSrc ? (
            <>
              <img src={imgSrc} alt="Preview" className="w-full rounded-lg border border-border" />
              <a
                href={imgSrc}
                download="cvrei-news-post.png"
                className="block text-center px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2"
              >
                ↓ Download PNG
              </a>
              {result?.warning && <div className="text-[11px] text-[#C44A3A]">{result.warning}</div>}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">
                  Suggested caption
                </div>
                <textarea
                  className={inputCls}
                  rows={8}
                  defaultValue={result?.caption}
                  key={result?.caption}
                />
              </div>
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
