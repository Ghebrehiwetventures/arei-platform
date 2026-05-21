import { useEffect, useState } from "react";
import { supabaseAuth } from "./supabase";

interface Listing {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  price: number | null;
  price_period: string;
  island: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  description: string | null;
  image_urls: string[];
  cover_image_url: string | null;
  source_url: string | null;
  listing_url: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()) as Record<string, string> };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch("/api/social-listing", {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data as T;
}

interface PublishedPost {
  id: string;
  listing_id: string;
  external_post_id: string;
  permalink: string | null;
  caption: string;
  image_urls: string[];
  published_at: string;
}

export function ListingSocialView() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [igConfigured, setIgConfigured] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [permalink, setPermalink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = listings.find((l) => l.id === selectedId) || null;
  const allImages = selected?.image_urls || [];

  const filtered = search.trim()
    ? listings.filter(
        (l) =>
          l.title?.toLowerCase().includes(search.toLowerCase()) ||
          l.island?.toLowerCase().includes(search.toLowerCase()) ||
          l.source_name?.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  const loadState = () => {
    return apiFetch<{ listings: Listing[]; published: PublishedPost[]; instagram: { configured: boolean } }>("GET")
      .then(({ listings: ls, published: ps, instagram }) => {
        setListings(ls);
        setPublished(ps || []);
        setIgConfigured(instagram.configured);
        if (ls.length > 0 && !ls.find((l) => l.id === selectedId)) {
          setSelectedId(ls[0].id);
        } else if (ls.length === 0) {
          setSelectedId("");
        }
      });
  };

  useEffect(() => {
    loadState()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setCaption("");
    setPermalink("");
    setError("");
    setNotice("");
    // Auto-select first 10 images (Instagram carousel max)
    const listing = listings.find((l) => l.id === selectedId);
    setSelectedImages((listing?.image_urls || []).slice(0, 10));

    setCaptionLoading(true);
    apiFetch<{ caption: string }>("POST", { action: "generate_caption", listingId: selectedId })
      .then(({ caption: c }) => setCaption(c))
      .catch((err) => setError(err.message))
      .finally(() => setCaptionLoading(false));
  }, [selectedId]);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 10) return prev; // hard cap at Instagram limit
      return [...prev, url];
    });
  };

  const moveImage = (url: string, delta: number) => {
    setSelectedImages((prev) => {
      const from = prev.indexOf(url);
      if (from < 0) return prev;
      const to = Math.max(0, Math.min(prev.length - 1, from + delta));
      if (to === from) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!selectedId || !caption.trim() || selectedImages.length < 2) return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch<{ postId: string; permalink: string }>("POST", {
        action: "publish_carousel",
        listingId: selectedId,
        imageUrls: selectedImages,
        caption: caption.trim(),
      });
      setPermalink(result.permalink);
      setNotice("Published to Instagram.");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-foreground-muted font-mono">Loading listings...</div>;
  }

  const canPublish = igConfigured && selectedId && caption.trim() && selectedImages.length >= 2 && !publishing;

  return (
    <div className="space-y-6">
      <section>
        <div className="label-style mb-1">Market Intelligence &gt; Listing Social</div>
        <h2 className="text-2xl font-semibold text-foreground font-mono mb-1">Listing Social</h2>
        <p className="text-sm text-foreground-muted">
          Pick a listing, select images, and publish as an Instagram carousel.
        </p>
      </section>

      {(error || notice) && (
        <section className="space-y-2">
          {error && <div className="border border-red bg-red/10 text-red p-3 text-sm font-mono">{error}</div>}
          {notice && (
            <div className="border border-green bg-green/10 text-green p-3 text-sm font-mono">
              {notice}
              {permalink && (
                <a href={permalink} target="_blank" rel="noopener noreferrer" className="ml-3 underline">
                  Open on Instagram
                </a>
              )}
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        {/* Left: listing picker */}
        <div className="surface-1 rounded border border-border p-4 space-y-3">
          <div>
            <div className="label-style mb-1">Search</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, island, agency..."
              className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
            />
          </div>
          <div>
            <div className="label-style mb-1">Listing ({filtered.length} of {listings.length})</div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              size={10}
              className="bg-background border border-border text-foreground px-2 py-1 text-xs font-mono w-full rounded"
            >
              {filtered.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || l.id}
                </option>
              ))}
            </select>
          </div>

          {selected && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono border-t border-border pt-3">
              <div><span className="text-foreground-muted">Source</span><br />{selected.source_name}</div>
              <div><span className="text-foreground-muted">Island</span><br />{selected.island}</div>
              <div><span className="text-foreground-muted">Price</span><br />
                {selected.price
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(selected.price)
                  : "POA"}
              </div>
              <div><span className="text-foreground-muted">Specs</span><br />
                {[
                  selected.bedrooms ? `${selected.bedrooms}bd` : null,
                  selected.bathrooms ? `${selected.bathrooms}ba` : null,
                  selected.area_sqm ? `${Math.round(selected.area_sqm)}m²` : null,
                ].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs font-mono border-t border-border pt-3">
              <a
                href={selected.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green truncate hover:underline"
              >
                ↗ capeverderealestateindex.com
              </a>
              {selected.source_url && (
                <a
                  href={selected.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-muted truncate hover:underline hover:text-foreground"
                >
                  ↗ {selected.source_name}
                </a>
              )}
            </div>
          </>
          )}
        </div>

        {/* Right: images + caption + publish */}
        <div className="space-y-4">
          {/* Image selection */}
          {allImages.length > 0 && (
            <div className="surface-1 rounded border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono text-foreground-muted">
                  <span className="text-foreground">{selectedImages.length}</span> / {allImages.length} selected · max 10
                </div>
                <div className="flex gap-3 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedImages(allImages.slice(0, 10))}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    Select 10
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImages([])}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {[
                  ...selectedImages,
                  ...allImages.filter((u) => !selectedImages.includes(u)),
                ].map((url, i) => {
                  const position = selectedImages.indexOf(url);
                  const active = position >= 0;
                  return (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-sm group"
                    >
                      <img
                        src={url}
                        alt=""
                        draggable={false}
                        onClick={() => toggleImage(url)}
                        className={`w-full h-full object-cover transition-all cursor-pointer ${
                          active ? "" : "grayscale opacity-25"
                        }`}
                      />
                      {active && (
                        <>
                          <span className="absolute top-1 left-1 bg-green text-black text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded leading-tight pointer-events-none">
                            {position + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveImage(url, -1); }}
                            disabled={position === 0}
                            className="absolute bottom-1 left-1 bg-black/70 hover:bg-black text-white text-[10px] font-mono w-5 h-5 rounded leading-none disabled:opacity-30 flex items-center justify-center"
                            title="Move left"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveImage(url, 1); }}
                            disabled={position === selectedImages.length - 1}
                            className="absolute bottom-1 right-1 bg-black/70 hover:bg-black text-white text-[10px] font-mono w-5 h-5 rounded leading-none disabled:opacity-30 flex items-center justify-center"
                            title="Move right"
                          >
                            ▶
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedImages.length < 2 && (
                <p className="text-amber text-[11px] font-mono mt-2">Select at least 2 images.</p>
              )}
              {selectedImages.length >= 2 && (
                <p className="text-foreground-muted text-[11px] font-mono mt-2">Use ◀ ▶ on each image to reorder · number = carousel position.</p>
              )}
            </div>
          )}

          {/* Caption + publish */}
          <div className="surface-1 rounded border border-border p-4 space-y-3">
            <div className="label-style">
              Caption
              {captionLoading && <span className="ml-2 text-foreground-muted font-normal normal-case">generating...</span>}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={12}
              className="w-full bg-background border border-border text-foreground p-3 text-sm font-mono leading-relaxed rounded"
              placeholder={captionLoading ? "Generating caption..." : "Select a listing"}
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
              >
                {publishing
                  ? "Publishing..."
                  : `Publish to Instagram (${selectedImages.length} images)`}
              </button>
              <div className="text-xs font-mono text-foreground-muted whitespace-nowrap">
                Instagram: {igConfigured
                  ? <span className="text-green">configured</span>
                  : <span className="text-red">not configured</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {published.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground font-mono">Published ({published.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {published.map((post) => (
              <div key={post.id} className="surface-1 border border-border rounded p-3 text-xs font-mono space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-foreground truncate flex-1" title={post.listing_id}>{post.listing_id}</div>
                  <div className="text-foreground-muted whitespace-nowrap">
                    {new Date(post.published_at).toLocaleDateString()}
                  </div>
                </div>
                {post.image_urls?.[0] && (
                  <img src={post.image_urls[0]} alt="" className="w-full aspect-square object-cover rounded" />
                )}
                <div className="text-foreground-muted line-clamp-2">{post.caption.split("\n")[0]}</div>
                <div className="flex items-center gap-3 pt-1">
                  {post.permalink && (
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
                      ↗ Instagram
                    </a>
                  )}
                  <a
                    href={`https://www.capeverderealestateindex.com/listing/${post.listing_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted hover:text-foreground hover:underline"
                  >
                    ↗ Listing
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
