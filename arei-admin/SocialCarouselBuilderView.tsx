import React, { useEffect, useMemo, useState } from "react";
import { supabaseAuth } from "./supabase";
import { makeZip, base64ToBytes, downloadBlob, type ZipFile } from "./zip";

// Social Carousel Builder — manual, photo-first social carousels from REAL
// Cape Verde listings + real market data. First format: "What €100k buys you
// in Cape Verde". Renders both 4:5 (IG/FB/Threads/LinkedIn) and 9:16 (TikTok
// Photo Mode/Reels/Stories), exports a ZIP, and can one-click publish the 4:5
// deck to Instagram (reuses /api/publish-news-post). No scheduling, no TikTok
// API — TikTok and other channels are manual via the ZIP.

const inputCls = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded";
const FORMATS = ["4:5", "9:16"] as const;
type Format = (typeof FORMATS)[number];

interface Listing {
  id: string;
  title: string;
  price: number | null;
  priceLabel: string;
  island: string;
  specs: string;
  images: string[];
  source_id: string;
  source_name: string;
  source_url: string;
  listing_url: string;
}

interface SlideSpec {
  type: "cover" | "statement" | "priceCheck" | "listing" | "cta";
  label: string;
  kicker?: string;
  title?: string;
  text?: string;
  accent?: string;
  dek?: string;
  sub?: string;
  url?: string;
  price?: string;
  specs?: string;
  location?: string;
  source?: string;
  imageUrl?: string;
  idx?: number;
  total?: number;
}

interface RenderedSlide {
  label: string;
  type: string;
  "4:5": string | null;
  "9:16": string | null;
  photoFailed: boolean;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Square thumbnail via wsrv proxy — same path the renderer uses, so the picker
// shows what will actually appear (and dodges hotlink-protection/webp in-browser).
const thumb = (url: string, size = 220) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=jpg&q=80`;

const euroToken = (s: string) => (s.match(/€\s?[\d.,]+\s?[kKmM]?/) || [])[0]?.trim() || "";
const lastWords = (s: string, n = 2) => s.trim().replace(/\s+/g, " ").split(" ").slice(-n).join(" ");
const capLabel = (cap: number) => (cap >= 1000 ? `€${Math.round(cap / 1000)}k` : `€${cap}`);

export function SocialCarouselBuilderView() {
  const [cap, setCap] = useState(100000);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected listings (ordered) + which image of each to use.
  const [selected, setSelected] = useState<{ id: string; img: number }[]>([]);

  // Editable copy.
  const [coverKicker, setCoverKicker] = useState("// CABO VERDE · WORLD CUP");
  const [coverTitle, setCoverTitle] = useState("What €100k buys you in Cape Verde");
  // Photo-first defaults: clean typographic cover, statement + price-check OFF.
  // Default deck = cover + 3 listing slides + CTA.
  const [coverPhoto, setCoverPhoto] = useState(false);
  const [stmtOn, setStmtOn] = useState(false);
  const [stmtKicker, setStmtKicker] = useState("// THE MOMENT");
  const [stmtText, setStmtText] = useState("While the world watches the football, investors are watching the islands.");
  const [pcOn, setPcOn] = useState(false);
  const [pcKicker, setPcKicker] = useState("// PRICE CHECK");
  const [pcText, setPcText] = useState("");
  const [ctaKicker, setCtaKicker] = useState("// THE INDEX");
  const [ctaTitle, setCtaTitle] = useState("See what it actually costs.");
  const [ctaSub, setCtaSub] = useState("Live Cape Verde listings · structured property data.");
  const [ctaUrl, setCtaUrl] = useState("capeverderealestateindex.com");

  const [igCaption, setIgCaption] = useState("");
  const [ttCaption, setTtCaption] = useState("");

  // Render / preview state.
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [slides, setSlides] = useState<RenderedSlide[]>([]);
  const [previewFmt, setPreviewFmt] = useState<Format>("4:5");

  // Publish state.
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ permalink: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const listingById = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listings]);

  function loadListings(nextCap: number) {
    setLoading(true);
    setLoadError(null);
    authHeaders()
      .then((h) =>
        fetch(`/api/social-carousel?cap=${nextCap}`, { credentials: "include", headers: h }).then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
          return d.listings as Listing[];
        })
      )
      .then((rows) => {
        setListings(rows);
        // Auto-select the first 3 eligible (cheapest-first from the API).
        setSelected(rows.slice(0, 3).map((l) => ({ id: l.id, img: 0 })));
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadListings(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedListings = selected.map((s) => listingById[s.id]).filter(Boolean) as Listing[];

  function regenerateCaptions() {
    const n = selected.length || 3;
    const sources = Array.from(new Set(selectedListings.map((l) => l.source_name)));
    const hook = "Everyone is looking at Cape Verde. We track what property actually costs there.";
    const body = `${n} homes under ${capLabel(cap)} — real listings, real prices, indexed by CVREI.`;
    const srcLine = sources.length ? `Listings via ${sources.join(", ")}.` : "";
    const igTags = "#CapeVerde #CaboVerde #RealEstate #WorldCup #PropertyInvestment #IslandLife #CVREI";
    const ttTags = "#capeverde #caboverde #worldcup #realestate #fyp";
    setIgCaption([hook, body, srcLine, "capeverderealestateindex.com", igTags].filter(Boolean).join("\n\n"));
    setTtCaption([`What ${capLabel(cap)} buys you in Cape Verde 🇨🇻`, body, ttTags].join("\n\n"));
  }

  // Build the ordered slide spec from current state.
  function buildSlides(): SlideSpec[] {
    const sel = selectedListings.map((l, i) => ({ l, img: l.images[selected[i]?.img ?? 0] || l.images[0] }));
    const list: SlideSpec[] = [];
    list.push({
      type: "cover",
      label: "Cover",
      kicker: coverKicker,
      title: coverTitle,
      accent: euroToken(coverTitle),
      imageUrl: coverPhoto ? sel[0]?.img : undefined,
    });
    if (stmtOn) list.push({ type: "statement", label: "Statement", kicker: stmtKicker, text: stmtText, accent: lastWords(stmtText, 2) });
    if (pcOn) {
      const pc = pcText.trim() || `${sel.length} homes under ${capLabel(cap)}`;
      list.push({ type: "priceCheck", label: "Price check", kicker: pcKicker, text: pc, accent: euroToken(pc) });
    }
    sel.forEach(({ l, img }, i) =>
      list.push({
        type: "listing",
        label: `Listing ${i + 1} · ${l.priceLabel}`,
        price: l.priceLabel,
        specs: l.specs,
        location: l.island,
        source: l.source_name,
        imageUrl: img,
      })
    );
    list.push({ type: "cta", label: "CTA", kicker: ctaKicker, title: ctaTitle, accent: lastWords(ctaTitle, 2), sub: ctaSub, url: ctaUrl });
    // Fill in deck position counters for listing slides.
    const total = list.length;
    list.forEach((s, i) => {
      if (s.type === "listing") {
        s.idx = i + 1;
        s.total = total;
      }
    });
    return list;
  }

  async function renderOne(slide: SlideSpec, format: Format): Promise<{ base64: string | null; photoFailed: boolean }> {
    const res = await fetch("/api/social-carousel", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ slide, format }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || `Render failed (${res.status})`);
    return { base64: d.base64 || null, photoFailed: Boolean(d.photoFailed) };
  }

  async function renderPreview() {
    if (selected.length < 3) {
      setRenderError("Pick at least 3 listings.");
      return;
    }
    setRendering(true);
    setRenderError(null);
    setPublished(null);
    setPublishError(null);
    try {
      const spec = buildSlides();
      const out: RenderedSlide[] = spec.map((s) => ({ label: s.label, type: s.type, "4:5": null, "9:16": null, photoFailed: false }));
      const tasks: { i: number; format: Format }[] = [];
      spec.forEach((_, i) => FORMATS.forEach((f) => tasks.push({ i, format: f })));
      let cursor = 0;
      let firstError: string | null = null;
      const worker = async () => {
        while (cursor < tasks.length) {
          const t = tasks[cursor++];
          try {
            const { base64, photoFailed } = await renderOne(spec[t.i], t.format);
            out[t.i][t.format] = base64;
            if (photoFailed) out[t.i].photoFailed = true;
          } catch (e: any) {
            if (!firstError) firstError = e.message || String(e);
          }
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      setSlides(out);
      if (firstError) setRenderError(`Some slides failed: ${firstError}`);
      if (!igCaption && !ttCaption) regenerateCaptions();
    } catch (e: any) {
      setRenderError(e.message || String(e));
    } finally {
      setRendering(false);
    }
  }

  function metadataJson() {
    return JSON.stringify(
      {
        type: "what-100k-buys-you",
        priceCap: cap,
        generatedAt: new Date().toISOString(),
        listings: selectedListings.map((l) => ({
          id: l.id,
          price: l.price,
          priceLabel: l.priceLabel,
          island: l.island,
          source_name: l.source_name,
          source_url: l.source_url,
          listing_url: l.listing_url,
        })),
      },
      null,
      2
    );
  }

  function downloadZip() {
    const files: ZipFile[] = [];
    const enc = new TextEncoder();
    const pad = (n: number) => String(n).padStart(2, "0");
    slides.forEach((s, i) => {
      const base = `${pad(i + 1)}-${s.type}`;
      if (s["4:5"]) files.push({ name: `4x5/${base}.png`, data: base64ToBytes(s["4:5"]!) });
      if (s["9:16"]) files.push({ name: `9x16/${base}.png`, data: base64ToBytes(s["9:16"]!) });
    });
    files.push({ name: "instagram-caption.txt", data: enc.encode(igCaption) });
    files.push({ name: "tiktok-caption.txt", data: enc.encode(ttCaption) });
    files.push({ name: "metadata.json", data: enc.encode(metadataJson()) });
    downloadBlob(makeZip(files), `cvrei-carousel-${Date.now()}.zip`);
  }

  async function publishInstagram() {
    const images = slides.map((s) => s["4:5"]).filter((b): b is string => Boolean(b));
    if (images.length < 2) {
      setPublishError("Need at least 2 rendered 4:5 slides to publish a carousel.");
      return;
    }
    if (!window.confirm("Publish this carousel to Instagram now? It goes live immediately.")) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch("/api/publish-news-post", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ images, caption: igCaption }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Publish failed (${res.status})`);
      setPublished({ permalink: d.permalink || "" });
    } catch (e: any) {
      setPublishError(e.message || String(e));
    } finally {
      setPublishing(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((cur) => {
      if (cur.some((s) => s.id === id)) return cur.filter((s) => s.id !== id);
      if (cur.length >= 5) return cur; // cap at 5 listing slides
      return [...cur, { id, img: 0 }];
    });
  }
  function move(idx: number, dir: -1 | 1) {
    setSelected((cur) => {
      const next = [...cur];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function setImg(id: string, img: number) {
    setSelected((cur) => cur.map((s) => (s.id === id ? { ...s, img } : s)));
  }

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5">
        <h1 className="text-xl font-mono font-semibold tracking-wide">Social Carousel Builder</h1>
        <p className="text-xs text-foreground-muted mt-1">
          Photo-first social carousels from real Cape Verde listings + real market data. First format:
          <b> “What {capLabel(cap)} buys you in Cape Verde”</b>. Exports 4:5 (Instagram/Facebook/Threads/LinkedIn)
          and 9:16 (TikTok/Reels/Stories). Manual quality control — you pick the listings and photos.
        </p>
      </div>

      {/* ── Type + cap ─────────────────────────────── */}
      <Section title="1 · Carousel">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="block">
            <Label>Type</Label>
            <select className={inputCls + " w-56"} value="what-100k" disabled>
              <option value="what-100k">What €100k buys you</option>
            </select>
          </label>
          <label className="block">
            <Label>Price cap (€)</Label>
            <input
              type="number"
              className={inputCls + " w-40"}
              value={cap}
              min={10000}
              step={5000}
              onChange={(e) => setCap(Math.max(10000, Number(e.target.value) || 100000))}
              onBlur={() => loadListings(cap)}
            />
          </label>
          <button
            onClick={() => loadListings(cap)}
            className="px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2"
          >
            ↻ Reload eligible listings
          </button>
        </div>
      </Section>

      {/* ── Listings ───────────────────────────────── */}
      <Section title={`2 · Listings (${selected.length}/5 selected · ${listings.length} eligible under ${capLabel(cap)})`}>
        {loading && <div className="text-xs text-foreground-muted">Loading listings…</div>}
        {loadError && <div className="text-xs text-[#C44A3A]">{loadError}</div>}
        {!loading && !loadError && listings.length === 0 && (
          <div className="text-xs text-foreground-muted">
            No eligible listings under {capLabel(cap)} with a valid image. Try a higher price cap.
          </div>
        )}

        {/* Selected, ordered */}
        {selectedListings.length > 0 && (
          <div className="space-y-2 mb-4">
            <Label>Selected — order is the carousel order</Label>
            {selected.map((s, i) => {
              const l = listingById[s.id];
              if (!l) return null;
              return (
                <div key={s.id} className="flex items-center gap-3 border border-border rounded p-2">
                  <span className="text-[11px] font-mono text-foreground-subtle w-5 text-center">{i + 1}</span>
                  <img src={thumb(l.images[s.img] || l.images[0], 120)} alt="" className="w-14 h-14 object-cover rounded border border-border" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold">{l.priceLabel} · {l.island}</div>
                    <div className="text-[10px] font-mono text-foreground-subtle truncate">{l.specs} · {l.source_name}</div>
                    {l.images.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        {l.images.slice(0, 6).map((im, ix) => (
                          <button
                            key={ix}
                            onClick={() => setImg(l.id, ix)}
                            className={"w-8 h-8 rounded overflow-hidden border " + (s.img === ix ? "border-accent" : "border-border opacity-70")}
                            title={`Use image ${ix + 1}`}
                          >
                            <img src={thumb(im, 64)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 text-xs border border-border rounded disabled:opacity-30 hover:bg-surface-2">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="px-2 text-xs border border-border rounded disabled:opacity-30 hover:bg-surface-2">↓</button>
                  </div>
                  <button onClick={() => toggleSelect(l.id)} className="px-2 py-1 text-[10px] font-mono border border-border rounded hover:bg-surface-2" title="Remove">✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Eligible grid */}
        {listings.length > 0 && (
          <div>
            <Label>Eligible — click to add / remove (max 5)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1 max-h-[360px] overflow-y-auto">
              {listings.map((l) => {
                const sel = selected.some((s) => s.id === l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggleSelect(l.id)}
                    className={"text-left border rounded overflow-hidden transition-colors " + (sel ? "border-accent ring-1 ring-accent" : "border-border hover:bg-surface-2")}
                  >
                    <div className="relative">
                      <img src={thumb(l.images[0], 240)} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                      {sel && <span className="absolute top-1 right-1 bg-accent text-accent-foreground text-[10px] font-mono px-1.5 rounded">✓</span>}
                    </div>
                    <div className="p-1.5">
                      <div className="text-[11px] font-mono font-semibold">{l.priceLabel}</div>
                      <div className="text-[10px] font-mono text-foreground-subtle truncate">{l.island} · {l.specs || "—"}</div>
                      <div className="text-[9px] font-mono text-foreground-subtle truncate">{l.source_name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── Copy ───────────────────────────────────── */}
      <Section title="3 · Copy">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Field label="Cover kicker"><input className={inputCls} value={coverKicker} onChange={(e) => setCoverKicker(e.target.value)} /></Field>
            <Field label="Cover headline"><input className={inputCls} value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
              <input type="checkbox" checked={coverPhoto} onChange={(e) => setCoverPhoto(e.target.checked)} />
              Use first listing photo on cover (else clean ink cover)
            </label>
            <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
              <input type="checkbox" checked={stmtOn} onChange={(e) => setStmtOn(e.target.checked)} />
              Include statement slide
            </label>
            {stmtOn && (
              <>
                <Field label="Statement kicker"><input className={inputCls} value={stmtKicker} onChange={(e) => setStmtKicker(e.target.value)} /></Field>
                <Field label="Statement text"><textarea className={inputCls} rows={2} value={stmtText} onChange={(e) => setStmtText(e.target.value)} /></Field>
              </>
            )}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
              <input type="checkbox" checked={pcOn} onChange={(e) => setPcOn(e.target.checked)} />
              Include price-check slide (off by default — the cover already says it)
            </label>
            {pcOn && (
              <>
                <Field label="Price-check kicker"><input className={inputCls} value={pcKicker} onChange={(e) => setPcKicker(e.target.value)} /></Field>
                <Field label={`Price-check headline (blank = "${selected.length} homes under ${capLabel(cap)}")`}>
                  <input className={inputCls} value={pcText} onChange={(e) => setPcText(e.target.value)} placeholder={`${selected.length} homes under ${capLabel(cap)}`} />
                </Field>
              </>
            )}
            <Field label="CTA kicker"><input className={inputCls} value={ctaKicker} onChange={(e) => setCtaKicker(e.target.value)} /></Field>
            <Field label="CTA headline"><input className={inputCls} value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} /></Field>
            <Field label="CTA sub"><input className={inputCls} value={ctaSub} onChange={(e) => setCtaSub(e.target.value)} /></Field>
            <Field label="CTA url"><input className={inputCls} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      {/* ── Render ─────────────────────────────────── */}
      <Section title="4 · Render & export">
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={renderPreview}
            disabled={rendering || selected.length < 3}
            className="px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50"
          >
            {rendering ? "Rendering…" : "Render preview →"}
          </button>
          {slides.length > 0 && (
            <>
              <div className="flex rounded border border-border overflow-hidden">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPreviewFmt(f)}
                    className={"px-3 py-2 text-xs font-mono " + (previewFmt === f ? "bg-accent text-accent-foreground" : "hover:bg-surface-2")}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={downloadZip} className="px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2">↓ Download ZIP (4:5 + 9:16 + captions)</button>
            </>
          )}
        </div>
        {renderError && <div className="text-xs text-[#C44A3A] mt-2">{renderError}</div>}

        {slides.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {slides.map((s, i) => {
                const b = s[previewFmt];
                return (
                  <div key={i} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">{String(i + 1).padStart(2, "0")} · {s.label}</div>
                    {b ? (
                      <img src={`data:image/png;base64,${b}`} alt={s.label} className="w-full rounded border border-border" />
                    ) : (
                      <div className="w-full aspect-[4/5] rounded border border-dashed border-border flex items-center justify-center text-[10px] text-foreground-muted">render failed</div>
                    )}
                    {s.photoFailed && <div className="text-[10px] text-[#C44A3A]">⚠ photo didn’t load — rendered without it</div>}
                  </div>
                );
              })}
            </div>

            {/* Captions */}
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Instagram caption</Label>
                  <button onClick={regenerateCaptions} className="text-[10px] font-mono text-accent hover:underline">↻ regenerate from selection</button>
                </div>
                <textarea className={inputCls} rows={8} value={igCaption} onChange={(e) => setIgCaption(e.target.value)} />
              </div>
              <div>
                <Label>TikTok caption</Label>
                <textarea className={inputCls + " mt-1"} rows={8} value={ttCaption} onChange={(e) => setTtCaption(e.target.value)} />
              </div>
            </div>

            {/* Publish */}
            <div className="mt-4">
              {published ? (
                <div className="text-xs font-mono text-accent border border-accent/40 rounded p-3">
                  ✓ Published to Instagram.
                  {published.permalink && <> <a href={published.permalink} target="_blank" rel="noreferrer" className="underline">View post →</a></>}
                </div>
              ) : (
                <button onClick={publishInstagram} disabled={publishing} className="px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50">
                  {publishing ? "Publishing…" : "Publish 4:5 carousel to Instagram"}
                </button>
              )}
              {publishError && <div className="text-xs text-[#C44A3A] mt-2">{publishError}</div>}
              <p className="text-[10px] font-mono text-foreground-subtle mt-2">
                TikTok / Facebook / Threads / LinkedIn: use the ZIP and post manually (9:16 PNGs + tiktok-caption.txt). On TikTok, add the trending sound in-app.
              </p>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded p-4 mb-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">{title}</div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
