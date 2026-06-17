import React, { useEffect, useMemo, useState } from "react";
import { supabaseAuth } from "./supabase";
import { makeZip, base64ToBytes, downloadBlob, type ZipFile } from "./zip";
import { proxyThumb } from "./imageProxy";
import { PRESETS, CTA_PRESETS, LISTING_LABELS, DISCLOSURE, DISCLOSURE_LISTINGS, SINGLE_DISCLOSURE, type CarouselPreset } from "./carouselPresets";

// Social Carousel Builder — manual, photo-first social carousels from REAL
// Cape Verde listings + real market data. Multiple campaign concepts (presets),
// organic vs paid-ad modes, index (not broker) language, robust broken-image
// handling, and tracking metadata for a future distribution machine. Renders
// 4:5 (IG/FB/Threads/LinkedIn) + 9:16 (TikTok/Reels/Stories), exports a ZIP, and
// one-click publishes the 4:5 deck to Instagram. No scheduling / no platform API.

const inputCls = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded";
const FORMATS = ["4:5", "9:16"] as const;
type Format = (typeof FORMATS)[number];
type Distribution = "organic" | "paid";

interface Listing {
  id: string; title: string; price: number | null; priceLabel: string;
  island: string; specs: string; images: string[];
  source_id: string; source_name: string; source_url: string; listing_url: string;
}
interface SlideSpec {
  type: "cover" | "statement" | "priceCheck" | "listing" | "cta";
  label: string;
  kicker?: string; title?: string; text?: string; accent?: string; dek?: string;
  sub?: string; url?: string; price?: string; specs?: string; location?: string;
  source?: string; tag?: string; imageUrl?: string; idx?: number; total?: number;
}
interface RenderedSlide {
  label: string; type: string;
  "4:5": string | null; "9:16": string | null;
  photoFailed: boolean; failedUrl: string | null;
}
interface Selected { id: string; img: number; adCleared: boolean; }

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Match a full price incl. space-separated thousands ("€100 000"), so the sage
// accent covers the whole figure, not just "€100".
const euroToken = (s: string) => (s.match(/€\s?\d[\d.,\s]*\d|€\s?\d/) || [])[0]?.trim() || "";
const lastWords = (s: string, n = 2) => s.trim().replace(/\s+/g, " ").split(" ").slice(-n).join(" ");
// European premium style: full price with space thousands separators, no "k".
const capLabel = (cap: number) => "€" + Math.round(cap).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function SocialCarouselBuilderView() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = useMemo<CarouselPreset>(() => PRESETS.find((p) => p.id === presetId) || PRESETS[0], [presetId]);
  const single = preset.mode === "single"; // one-listing spotlight (Cheap-Old-Houses-style discovery)
  const maxSelect = single ? 1 : 5;

  const [cap, setCap] = useState(PRESETS[0].priceCap || 100000);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());

  const [distribution, setDistribution] = useState<Distribution>("organic");
  const adSafe = distribution === "paid";

  // Copy.
  const [coverKicker, setCoverKicker] = useState(PRESETS[0].coverKicker);
  const [coverTitle, setCoverTitle] = useState(PRESETS[0].coverTitle);
  const [coverPhoto, setCoverPhoto] = useState(true);
  const [stmtOn, setStmtOn] = useState(false);
  const [stmtKicker, setStmtKicker] = useState("// THE MOMENT");
  const [stmtText, setStmtText] = useState("While the world watches the football, investors are watching the islands.");
  const [pcOn, setPcOn] = useState(false);
  const [pcKicker, setPcKicker] = useState("// PRICE CHECK");
  const [pcText, setPcText] = useState("");
  const [listingLabel, setListingLabel] = useState(LISTING_LABELS[0]);
  const ctaKicker = "// THE INDEX";
  const [ctaTitle, setCtaTitle] = useState(PRESETS[0].cta);
  const [ctaSub, setCtaSub] = useState("Live Cape Verde listings · structured property data.");
  const [ctaUrl, setCtaUrl] = useState("capeverderealestateindex.com");

  // Tracking (prep only — no live analytics in this phase).
  const [campaignName, setCampaignName] = useState("");
  const [creativeName, setCreativeName] = useState("");
  const [sourceChannel, setSourceChannel] = useState("instagram");
  const [landingUrl, setLandingUrl] = useState("https://www.capeverderealestateindex.com");

  const [igCaption, setIgCaption] = useState("");
  const [ttCaption, setTtCaption] = useState("");

  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [slides, setSlides] = useState<RenderedSlide[]>([]);
  const [previewFmt, setPreviewFmt] = useState<Format>("4:5");

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ permalink: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const listingById = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listings]);
  const selectedListings = selected.map((s) => listingById[s.id]).filter(Boolean) as Listing[];

  function loadListings(nextCap: number, autoCount: number) {
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
        setSelected(rows.slice(0, autoCount).map((l) => ({ id: l.id, img: 0, adCleared: false })));
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadListings(cap, preset.listingsRequired ? preset.defaultListings : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(p: CarouselPreset) {
    setPresetId(p.id);
    setCoverKicker(p.coverKicker);
    setCoverTitle(p.coverTitle);
    setCtaTitle(p.cta);
    setStmtOn(false);
    setPcOn(false);
    const newCap = p.priceCap || cap;
    setCap(newCap);
    setSlides([]);
    loadListings(newCap, p.listingsRequired ? p.defaultListings : 0);
  }

  function markBroken(url: string) {
    setBrokenThumbs((cur) => (cur.has(url) ? cur : new Set(cur).add(url)));
  }

  function regenerateCaptions() {
    const igTags = "#CapeVerde #CaboVerde #RealEstate #PropertyInvestment #IslandLife #CVREI" + (preset.allowMoment ? " #WorldCup" : "");
    const ttTags = "#capeverde #caboverde #realestate" + (preset.allowMoment ? " #worldcup" : "") + " #fyp";
    if (single) {
      // Source-linked spotlight: the listing + image belong to the original
      // source. Strong disclosure + the source name/URL in the caption.
      const l = selectedListings[0];
      const srcLine = l ? `Source: ${l.source_name} — ${l.source_url || l.listing_url}` : "";
      setIgCaption([preset.captionAngle, srcLine, SINGLE_DISCLOSURE, igTags].filter(Boolean).join("\n\n"));
      setTtCaption([preset.captionAngle, srcLine, SINGLE_DISCLOSURE, ttTags].filter(Boolean).join("\n\n"));
      return;
    }
    const sources = Array.from(new Set(selectedListings.map((l) => l.source_name)));
    const srcLine = sources.length ? `Source-linked listings via ${sources.join(", ")}.` : "";
    // When the carousel uses listing photos, the caption must state CVREI does
    // not own those listings/images; text-only concepts use the short line.
    const disc = selectedListings.length > 0 ? DISCLOSURE_LISTINGS : DISCLOSURE;
    setIgCaption([preset.captionAngle, srcLine, disc, landingUrl, igTags].filter(Boolean).join("\n\n"));
    setTtCaption([preset.coverTitle, preset.captionAngle, disc, ttTags].filter(Boolean).join("\n\n"));
  }

  // Ad-safe gate: in paid mode, a broker/listing photo may only be used if the
  // user has confirmed it's cleared for ad use.
  const photoAllowed = (cleared: boolean) => !adSafe || cleared;

  function buildSlides(): SlideSpec[] {
    const sel = selectedListings.map((l, i) => ({
      l,
      img: l.images[selected[i]?.img ?? 0] || l.images[0],
      cleared: selected[i]?.adCleared ?? false,
    }));
    const list: SlideSpec[] = [];

    // Single Listing spotlight: one photo-first listing slide + a source CTA.
    if (single) {
      const s0 = sel[0];
      if (s0) list.push({
        type: "listing", label: `Listing · ${s0.l.priceLabel}`, tag: listingLabel,
        price: s0.l.priceLabel, specs: s0.l.specs, location: s0.l.island, source: s0.l.source_name,
        imageUrl: photoAllowed(s0.cleared) ? s0.img : undefined, idx: 1, total: 2,
      });
      list.push({ type: "cta", label: "CTA", kicker: "// VIEW ORIGINAL SOURCE", title: ctaTitle, accent: lastWords(ctaTitle, 2), sub: ctaSub, url: ctaUrl, imageUrl: s0 && photoAllowed(s0.cleared) ? s0.img : undefined });
      return list;
    }

    // Photo-led: reuse the picked listing photos behind the text slides too
    // (cover / statement / price-check / CTA) so no slide is a blank solid
    // colour — Instagram is photo-first. Respect the ad-safe gate (only cleared
    // photos in paid mode); rotate so the text slides don't all show the same shot.
    const usable = sel.filter((s) => photoAllowed(s.cleared)).map((s) => s.img);
    let pi = 0;
    const nextPhoto = () => (usable.length ? usable[pi++ % usable.length] : undefined);

    list.push({ type: "cover", label: "Cover", kicker: coverKicker, title: coverTitle, accent: euroToken(coverTitle) || lastWords(coverTitle, 2), imageUrl: coverPhoto ? nextPhoto() : undefined });
    if (stmtOn) list.push({ type: "statement", label: "Statement", kicker: stmtKicker, text: stmtText, accent: lastWords(stmtText, 2), imageUrl: nextPhoto() });
    if (pcOn) {
      const pc = pcText.trim() || `${sel.length} homes under ${capLabel(cap)}`;
      list.push({ type: "priceCheck", label: "Price check", kicker: pcKicker, text: pc, accent: euroToken(pc), imageUrl: nextPhoto() });
    }
    sel.forEach(({ l, img, cleared }, i) =>
      list.push({
        type: "listing", label: `Listing ${i + 1} · ${l.priceLabel}`, tag: listingLabel,
        price: l.priceLabel, specs: l.specs, location: l.island, source: l.source_name,
        imageUrl: photoAllowed(cleared) ? img : undefined,
      })
    );
    list.push({ type: "cta", label: "CTA", kicker: ctaKicker, title: ctaTitle, accent: lastWords(ctaTitle, 2), sub: ctaSub, url: ctaUrl, imageUrl: nextPhoto() });
    const total = list.length;
    list.forEach((s, i) => { if (s.type === "listing") { s.idx = i + 1; s.total = total; } });
    return list;
  }

  async function renderOne(slide: SlideSpec, format: Format) {
    const res = await fetch("/api/social-carousel", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ slide, format }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || `Render failed (${res.status})`);
    return { base64: d.base64 as string | null, photoFailed: Boolean(d.photoFailed), failedUrl: (d.failedUrl as string) || null };
  }

  const needListings = preset.listingsRequired;
  const minListings = single ? 1 : 3;
  const canRender = !loading && (!needListings || selected.length >= minListings);

  async function renderPreview() {
    if (needListings && selected.length < minListings) { setRenderError(single ? "Pick a listing." : "This concept needs at least 3 listings."); return; }
    setRendering(true); setRenderError(null); setPublished(null); setPublishError(null);
    try {
      if (!igCaption && !ttCaption) regenerateCaptions();
      const spec = buildSlides();
      const out: RenderedSlide[] = spec.map((s) => ({ label: s.label, type: s.type, "4:5": null, "9:16": null, photoFailed: false, failedUrl: null }));
      const tasks: { i: number; format: Format }[] = [];
      spec.forEach((_, i) => FORMATS.forEach((f) => tasks.push({ i, format: f })));
      let cursor = 0; let firstError: string | null = null;
      const worker = async () => {
        while (cursor < tasks.length) {
          const t = tasks[cursor++];
          try {
            const r = await renderOne(spec[t.i], t.format);
            out[t.i][t.format] = r.base64;
            if (r.photoFailed) { out[t.i].photoFailed = true; out[t.i].failedUrl = r.failedUrl; }
          } catch (e: any) { if (!firstError) firstError = e.message || String(e); }
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      setSlides(out);
      if (firstError) setRenderError(`Some slides failed to render: ${firstError}`);
    } catch (e: any) { setRenderError(e.message || String(e)); }
    finally { setRendering(false); }
  }

  const failedSlides = slides.filter((s) => s.photoFailed);
  const exportBlocked = failedSlides.length > 0;

  function trackingMeta() {
    return {
      campaign_name: campaignName, creative_name: creativeName,
      concept: preset.id, format: "4:5+9:16",
      distribution, ad_safe: adSafe,
      source_channel: sourceChannel, landing_url: landingUrl,
      utm_source: sourceChannel || "instagram",
      utm_medium: adSafe ? "paid_social" : "organic_social",
      utm_campaign: slug(campaignName) || preset.id,
      utm_content: slug(creativeName) || preset.id,
    };
  }
  function metadataJson() {
    return JSON.stringify({
      ...trackingMeta(),
      disclosure: DISCLOSURE,
      generatedAt: new Date().toISOString(),
      listings: selectedListings.map((l) => ({
        id: l.id, price: l.price, priceLabel: l.priceLabel, island: l.island,
        source_name: l.source_name, source_url: l.source_url, listing_url: l.listing_url,
      })),
    }, null, 2);
  }

  function downloadZip() {
    if (exportBlocked) return;
    const files: ZipFile[] = []; const enc = new TextEncoder();
    const pad = (n: number) => String(n).padStart(2, "0");
    slides.forEach((s, i) => {
      const base = `${pad(i + 1)}-${s.type}`;
      if (s["4:5"]) files.push({ name: `4x5/${base}.png`, data: base64ToBytes(s["4:5"]!) });
      if (s["9:16"]) files.push({ name: `9x16/${base}.png`, data: base64ToBytes(s["9:16"]!) });
    });
    files.push({ name: "instagram-caption.txt", data: enc.encode(igCaption) });
    files.push({ name: "tiktok-caption.txt", data: enc.encode(ttCaption) });
    files.push({ name: "metadata.json", data: enc.encode(metadataJson()) });
    downloadBlob(makeZip(files), `cvrei-${preset.id}-${Date.now()}.zip`);
  }

  async function publishInstagram() {
    if (exportBlocked) { setPublishError("Resolve the failed images before publishing."); return; }
    const images = slides.map((s) => s["4:5"]).filter((b): b is string => Boolean(b));
    if (images.length < 2) { setPublishError("Need at least 2 rendered 4:5 slides to publish a carousel."); return; }
    if (adSafe && !window.confirm("This is marked PAID AD creative. Confirm every image is cleared/licensed for paid use?")) return;
    if (!window.confirm("Publish this carousel to Instagram now? It goes live immediately.")) return;
    setPublishing(true); setPublishError(null);
    try {
      const res = await fetch("/api/publish-news-post", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ images, caption: igCaption }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Publish failed (${res.status})`);
      setPublished({ permalink: d.permalink || "" });
    } catch (e: any) { setPublishError(e.message || String(e)); }
    finally { setPublishing(false); }
  }

  function toggleSelect(id: string) {
    setSelected((cur) => {
      if (cur.some((s) => s.id === id)) return cur.filter((s) => s.id !== id);
      if (single) return [{ id, img: 0, adCleared: false }]; // single mode: replace (max 1)
      if (cur.length >= maxSelect) return cur;
      return [...cur, { id, img: 0, adCleared: false }];
    });
  }
  function move(idx: number, dir: -1 | 1) {
    setSelected((cur) => { const n = [...cur]; const j = idx + dir; if (j < 0 || j >= n.length) return cur; [n[idx], n[j]] = [n[j], n[idx]]; return n; });
  }
  const setImg = (id: string, img: number) => setSelected((cur) => cur.map((s) => (s.id === id ? { ...s, img } : s)));
  const setCleared = (id: string, adCleared: boolean) => setSelected((cur) => cur.map((s) => (s.id === id ? { ...s, adCleared } : s)));
  function randomize() {
    if (listings.length === 0) return;
    // Match the concept's listing count (e.g. 5 for "5 homes under €100k").
    const count = Math.min(5, Math.max(1, preset.defaultListings || 3), listings.length);
    const pool = [...listings];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    setSelected(pool.slice(0, count).map((l) => ({ id: l.id, img: l.images.length ? Math.floor(Math.random() * l.images.length) : 0, adCleared: false })));
  }

  const Thumb = ({ url, cls }: { url: string; cls: string }) =>
    brokenThumbs.has(url)
      ? <div className={cls + " bg-surface-3 flex items-center justify-center text-[9px] font-mono text-foreground-subtle"}>broken</div>
      : <img src={proxyThumb(url, 240)} alt="" className={cls} loading="lazy" onError={() => markBroken(url)} />;

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5">
        <h1 className="text-xl font-mono font-semibold tracking-wide">Social Carousel Builder</h1>
        <p className="text-xs text-foreground-muted mt-1">
          Photo-first social carousels from real, source-linked Cape Verde listings + market data.
          CVREI organizes the market — it is not a broker. Exports 4:5 and 9:16; one-click Instagram publish.
        </p>
      </div>

      {/* ── Concept ─────────────────────────────────── */}
      <Section title="1 · Concept">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="block">
            <Label>Carousel concept</Label>
            <select className={inputCls + " w-72"} value={presetId} onChange={(e) => applyPreset(PRESETS.find((p) => p.id === e.target.value)!)}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block">
            <Label>Price cap (€)</Label>
            <input type="number" className={inputCls + " w-36"} value={cap} min={10000} step={5000}
              onChange={(e) => setCap(Math.max(10000, Number(e.target.value) || 100000))}
              onBlur={() => loadListings(cap, 0)} />
          </label>
          <button onClick={() => loadListings(cap, 0)} className="px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2">↻ Reload listings</button>
          <button onClick={randomize} disabled={loading || listings.length === 0} className="px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2 disabled:opacity-50">🎲 Random mix</button>
        </div>
        <p className="text-[11px] font-mono text-foreground-subtle mt-2">
          {single ? "Single Listing spotlight — one source-linked listing + a source CTA (pick 1 below)."
            : needListings ? "This concept uses listing slides (pick 3–5 below)."
            : "This concept is text-led — listings are optional."}
        </p>
      </Section>

      {/* ── Distribution ────────────────────────────── */}
      <Section title="2 · Distribution">
        <div className="flex gap-2">
          {(["organic", "paid"] as Distribution[]).map((d) => (
            <button key={d} onClick={() => setDistribution(d)}
              className={"px-3 py-2 rounded border text-xs font-mono " + (distribution === d ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-surface-2")}>
              {d === "organic" ? "Organic post" : "Paid ad creative"}
            </button>
          ))}
        </div>
        {adSafe && (
          <div className="mt-2 text-[11px] font-mono text-amber-700 border border-amber-300/60 bg-amber-50/40 rounded p-2">
            ⚠ Ad-safe mode. Use only approved/licensed images for paid distribution. Broker/listing photos are
            excluded from the creative unless you tick “cleared for ad use” per listing below. CVREI is an index, not a broker.
          </div>
        )}
      </Section>

      {/* ── Listings ───────────────────────────────── */}
      <Section title={`3 · ${single ? "Listing" : "Listings"} (${selected.length}/${maxSelect} · ${listings.length} eligible under ${capLabel(cap)})`}>
        {loading && <div className="text-xs text-foreground-muted">Loading listings…</div>}
        {loadError && <div className="text-xs text-[#C44A3A]">{loadError}</div>}
        {!loading && !loadError && listings.length === 0 && (
          <div className="text-xs text-foreground-muted">No eligible listings under {capLabel(cap)} with a real photo. Try a higher cap.</div>
        )}

        {selectedListings.length > 0 && (
          <div className="space-y-2 mb-4">
            <Label>Selected — order is the carousel order</Label>
            {selected.map((s, i) => {
              const l = listingById[s.id]; if (!l) return null;
              const cur = l.images[s.img] || l.images[0];
              return (
                <div key={s.id} className="flex items-center gap-3 border border-border rounded p-2">
                  <span className="text-[11px] font-mono text-foreground-subtle w-5 text-center">{i + 1}</span>
                  <Thumb url={cur} cls="w-14 h-14 object-cover rounded border border-border" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold">{l.priceLabel} · {l.island}</div>
                    <div className="text-[10px] font-mono text-foreground-subtle truncate">{l.specs || "—"} · {l.source_name}</div>
                    {l.images.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        {l.images.slice(0, 6).map((im, ix) => (
                          <button key={ix} onClick={() => setImg(l.id, ix)} title={`Use image ${ix + 1}`}
                            className={"w-8 h-8 rounded overflow-hidden border " + (s.img === ix ? "border-accent" : "border-border opacity-70")}>
                            <Thumb url={im} cls="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {brokenThumbs.has(cur) && <div className="text-[10px] text-[#C44A3A] mt-1 truncate" title={cur}>⚠ image won’t load — pick another. {cur}</div>}
                    {adSafe && (
                      <label className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-foreground-subtle">
                        <input type="checkbox" checked={s.adCleared} onChange={(e) => setCleared(l.id, e.target.checked)} />
                        Photo cleared/licensed for ad use {!s.adCleared && <span className="text-amber-700">— excluded from ad creative</span>}
                      </label>
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

        {listings.length > 0 && (
          <div>
            <Label>Eligible — click to add / remove (max {maxSelect})</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1 max-h-[360px] overflow-y-auto">
              {listings.map((l) => {
                const sel = selected.some((s) => s.id === l.id);
                return (
                  <button key={l.id} onClick={() => toggleSelect(l.id)}
                    className={"text-left border rounded overflow-hidden transition-colors " + (sel ? "border-accent ring-1 ring-accent" : "border-border hover:bg-surface-2")}>
                    <div className="relative">
                      <Thumb url={l.images[0]} cls="w-full aspect-square object-cover" />
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
      <Section title="4 · Copy">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {!single && (
              <>
                <Field label="Cover kicker"><input className={inputCls} value={coverKicker} onChange={(e) => setCoverKicker(e.target.value)} /></Field>
                <Field label="Cover headline"><input className={inputCls} value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} /></Field>
                <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
                  <input type="checkbox" checked={coverPhoto} onChange={(e) => setCoverPhoto(e.target.checked)} />
                  Use first listing photo on cover (else clean editorial cover)
                </label>
              </>
            )}
            <Field label="Listing-card label">
              <select className={inputCls} value={listingLabel} onChange={(e) => setListingLabel(e.target.value)}>
                {LISTING_LABELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            {!single && (
              <>
                <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
                  <input type="checkbox" checked={stmtOn} onChange={(e) => setStmtOn(e.target.checked)} /> Include statement slide
                </label>
                {stmtOn && (
                  <>
                    <Field label="Statement kicker"><input className={inputCls} value={stmtKicker} onChange={(e) => setStmtKicker(e.target.value)} /></Field>
                    <Field label="Statement text"><textarea className={inputCls} rows={2} value={stmtText} onChange={(e) => setStmtText(e.target.value)} /></Field>
                  </>
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            {!single && (
              <label className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
                <input type="checkbox" checked={pcOn} onChange={(e) => setPcOn(e.target.checked)} /> Include price-check slide
              </label>
            )}
            {!single && pcOn && (
              <>
                <Field label="Price-check kicker"><input className={inputCls} value={pcKicker} onChange={(e) => setPcKicker(e.target.value)} /></Field>
                <Field label={`Price-check headline (blank = "${selected.length} homes under ${capLabel(cap)}")`}>
                  <input className={inputCls} value={pcText} onChange={(e) => setPcText(e.target.value)} placeholder={`${selected.length} homes under ${capLabel(cap)}`} />
                </Field>
              </>
            )}
            <Field label="CTA preset">
              <select className={inputCls} value={CTA_PRESETS.includes(ctaTitle) ? ctaTitle : ""} onChange={(e) => e.target.value && setCtaTitle(e.target.value)}>
                <option value="">— custom —</option>
                {CTA_PRESETS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="CTA headline"><input className={inputCls} value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} /></Field>
            <Field label="CTA sub"><input className={inputCls} value={ctaSub} onChange={(e) => setCtaSub(e.target.value)} /></Field>
            <Field label="CTA url"><input className={inputCls} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      {/* ── Tracking (prep) ─────────────────────────── */}
      <Section title="5 · Campaign tracking (optional — prep for distribution)">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Campaign name"><input className={inputCls} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. world-cup-2026" /></Field>
          <Field label="Creative name"><input className={inputCls} value={creativeName} onChange={(e) => setCreativeName(e.target.value)} placeholder="e.g. 100k-sal-v1" /></Field>
          <Field label="Source channel"><input className={inputCls} value={sourceChannel} onChange={(e) => setSourceChannel(e.target.value)} placeholder="instagram / tiktok / facebook" /></Field>
          <Field label="Landing URL"><input className={inputCls} value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} /></Field>
        </div>
        <p className="text-[10px] font-mono text-foreground-subtle mt-2">Written to metadata.json with auto UTMs (no live analytics yet — Chapter 2 wires tracking/conversion).</p>
      </Section>

      {/* ── Render & export ─────────────────────────── */}
      <Section title="6 · Render & export">
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={renderPreview} disabled={rendering || !canRender}
            className="px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50">
            {rendering ? "Rendering…" : "Render preview →"}
          </button>
          {slides.length > 0 && (
            <>
              <div className="flex rounded border border-border overflow-hidden">
                {FORMATS.map((f) => (
                  <button key={f} onClick={() => setPreviewFmt(f)} className={"px-3 py-2 text-xs font-mono " + (previewFmt === f ? "bg-accent text-accent-foreground" : "hover:bg-surface-2")}>{f}</button>
                ))}
              </div>
              <button onClick={downloadZip} disabled={exportBlocked} className="px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2 disabled:opacity-50">↓ Download ZIP</button>
            </>
          )}
        </div>
        {!canRender && needListings && <div className="text-[11px] text-foreground-subtle mt-2">Pick at least 3 listings to render this concept.</div>}
        {renderError && <div className="text-xs text-[#C44A3A] mt-2">{renderError}</div>}

        {exportBlocked && (
          <div className="mt-3 text-[11px] font-mono text-[#C44A3A] border border-[#C44A3A]/40 rounded p-2">
            ⚠ {failedSlides.length} slide(s) have an image that didn’t load — export &amp; publish are blocked so nothing broken ships.
            Pick another photo for the affected listing(s) and re-render. Failed sources:
            <ul className="mt-1 space-y-0.5">
              {failedSlides.map((s, i) => <li key={i} className="truncate">· {s.label}: {s.failedUrl || "unknown URL"}</li>)}
            </ul>
          </div>
        )}

        {slides.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {slides.map((s, i) => {
                const b = s[previewFmt];
                return (
                  <div key={i} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">{String(i + 1).padStart(2, "0")} · {s.label}</div>
                    {b ? <img src={`data:image/png;base64,${b}`} alt={s.label} className={"w-full rounded border " + (s.photoFailed ? "border-[#C44A3A]" : "border-border")} />
                      : <div className="w-full aspect-[4/5] rounded border border-dashed border-border flex items-center justify-center text-[10px] text-foreground-muted">render failed</div>}
                    {s.photoFailed && <div className="text-[10px] text-[#C44A3A]">⚠ photo didn’t load</div>}
                  </div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Instagram caption</Label>
                  <button onClick={regenerateCaptions} className="text-[10px] font-mono text-accent hover:underline">↻ regenerate</button>
                </div>
                <textarea className={inputCls} rows={9} value={igCaption} onChange={(e) => setIgCaption(e.target.value)} />
              </div>
              <div>
                <Label>TikTok caption</Label>
                <textarea className={inputCls + " mt-1"} rows={9} value={ttCaption} onChange={(e) => setTtCaption(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              {published ? (
                <div className="text-xs font-mono text-accent border border-accent/40 rounded p-3">
                  ✓ Published to Instagram.
                  {published.permalink && <> <a href={published.permalink} target="_blank" rel="noreferrer" className="underline">View post →</a></>}
                </div>
              ) : (
                <button onClick={publishInstagram} disabled={publishing || exportBlocked}
                  className="px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50">
                  {publishing ? "Publishing…" : `Publish 4:5 carousel to Instagram${adSafe ? " (paid — confirm rights)" : ""}`}
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
  return <label className="block"><Label>{label}</Label>{children}</label>;
}
