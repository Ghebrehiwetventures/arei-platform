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

export function ListingSocialView() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [igConfigured, setIgConfigured] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [permalink, setPermalink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = listings.find((l) => l.id === selectedId) || null;

  const filtered = search.trim()
    ? listings.filter(
        (l) =>
          l.title?.toLowerCase().includes(search.toLowerCase()) ||
          l.island?.toLowerCase().includes(search.toLowerCase()) ||
          l.source_name?.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  useEffect(() => {
    apiFetch<{ listings: Listing[]; instagram: { configured: boolean } }>("GET")
      .then(({ listings: ls, instagram }) => {
        setListings(ls);
        setIgConfigured(instagram.configured);
        if (ls.length > 0) setSelectedId(ls[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setCaption("");
    setPermalink("");
    setError("");
    setNotice("");
    setCaptionLoading(true);
    apiFetch<{ caption: string }>("POST", { action: "generate_caption", listingId: selectedId })
      .then(({ caption: c }) => setCaption(c))
      .catch((err) => setError(err.message))
      .finally(() => setCaptionLoading(false));
  }, [selectedId]);

  const handlePublish = async () => {
    if (!selectedId || !caption.trim()) return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const result = await apiFetch<{ postId: string; permalink: string }>("POST", {
        action: "publish_carousel",
        listingId: selectedId,
        caption: caption.trim(),
      });
      setPermalink(result.permalink);
      setNotice("Published to Instagram.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-foreground-muted font-mono">Loading listings...</div>;
  }

  const images = selected?.image_urls?.slice(0, 10) || [];
  const canPublish = igConfigured && selectedId && caption.trim() && images.length >= 2 && !publishing;

  return (
    <div className="space-y-8">
      <section>
        <div className="label-style mb-2">Market Intelligence &gt; Listing Social</div>
        <h2 className="text-2xl font-semibold text-foreground font-mono mb-1">Listing Social</h2>
        <p className="text-sm text-foreground-muted max-w-3xl">
          Pick a listing, review the auto-generated caption, and post the listing images as an Instagram carousel.
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

      <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        {/* Left: listing picker */}
        <div className="surface-1 rounded border border-border p-4 space-y-4">
          <div>
            <div className="label-style mb-1">Search listings</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, island, or agency..."
              className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
            />
          </div>
          <div>
            <div className="label-style mb-1">
              Listing ({filtered.length}{filtered.length !== listings.length ? ` of ${listings.length}` : ""})
            </div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              size={8}
              className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
            >
              {filtered.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || l.id} — {l.island}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <div className="label-style mb-0.5">Source</div>
                  <div className="text-foreground">{selected.source_name}</div>
                </div>
                <div>
                  <div className="label-style mb-0.5">Island</div>
                  <div className="text-foreground">{selected.island}</div>
                </div>
                <div>
                  <div className="label-style mb-0.5">Price</div>
                  <div className="text-foreground">
                    {selected.price
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(selected.price)
                      : "POA"}
                  </div>
                </div>
                <div>
                  <div className="label-style mb-0.5">Specs</div>
                  <div className="text-foreground">
                    {[
                      selected.bedrooms ? `${selected.bedrooms}bd` : null,
                      selected.bathrooms ? `${selected.bathrooms}ba` : null,
                      selected.area_sqm ? `${Math.round(selected.area_sqm)}m²` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </div>
                </div>
              </div>

              {/* Image strip */}
              {images.length > 0 && (
                <div>
                  <div className="label-style mb-1">{images.length} image{images.length !== 1 ? "s" : ""} — carousel</div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {images.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-16 w-16 object-cover rounded flex-shrink-0 border border-border"
                      />
                    ))}
                  </div>
                  {images.length < 2 && (
                    <p className="text-amber text-xs font-mono mt-1">Need at least 2 images for a carousel.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: caption + publish */}
        <div className="surface-1 rounded border border-border p-4 space-y-4">
          <div>
            <div className="label-style mb-1">
              Caption
              {captionLoading && <span className="ml-2 text-foreground-muted font-normal normal-case">generating...</span>}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={18}
              className="w-full bg-background border border-border text-foreground p-3 text-sm font-mono leading-relaxed rounded"
              placeholder={captionLoading ? "Generating caption..." : "Select a listing to generate caption"}
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className="w-full px-4 py-3 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
            >
              {publishing ? "Publishing..." : `Publish carousel to Instagram (${images.length} images)`}
            </button>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-foreground-muted">
              <div>Instagram: {igConfigured ? <span className="text-green">configured</span> : <span className="text-red">not configured</span>}</div>
              <div>Images: {images.length} / 10 max</div>
            </div>

            {!igConfigured && (
              <p className="text-amber text-xs font-mono">
                Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in Vercel to enable publishing.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
