import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

type SchedulePattern = "1_per_day" | "2_per_day" | "3_per_week";

const SCHEDULE_PATTERNS: { value: SchedulePattern; label: string; desc: string }[] = [
  { value: "1_per_day",   label: "1 / day",    desc: "Every day at 10:00" },
  { value: "2_per_day",   label: "2 / day",    desc: "Daily at 10:00 & 19:00" },
  { value: "3_per_week",  label: "3 / week",   desc: "Mon · Wed · Fri at 10:00" },
];

function nextSlot(pattern: SchedulePattern, takenISO: string[]): Date {
  const taken = new Set(takenISO.map((s) => new Date(s).toISOString().slice(0, 16)));
  const now = new Date();

  for (let day = 0; day <= 30; day++) {
    const base = new Date(now);
    base.setDate(base.getDate() + day);

    let hours: number[] = [];
    if (pattern === "1_per_day") {
      hours = [10];
    } else if (pattern === "2_per_day") {
      hours = [10, 19];
    } else {
      const dow = base.getDay(); // 0=Sun
      if (dow !== 1 && dow !== 3 && dow !== 5) continue;
      hours = [10];
    }

    for (const h of hours) {
      const candidate = new Date(base);
      candidate.setHours(h, 0, 0, 0);
      if (candidate <= now) continue;
      const key = candidate.toISOString().slice(0, 16);
      if (!taken.has(key)) return candidate;
    }
  }
  // fallback: 24h from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function previewImageUrl(url: string, size = 220): string {
  if (!url) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=jpg&q=82`;
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

interface QueueItem {
  id: string;
  listing_id: string;
  listing_title: string | null;
  caption: string;
  image_urls: string[];
  scheduled_at: string;
  status: "pending" | "published" | "failed";
  error_message: string | null;
  post_id: string | null;
  permalink: string | null;
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const didDragRef = useRef(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>(
    () => (localStorage.getItem("ig_schedule_pattern") as SchedulePattern) || "1_per_day"
  );
  const [scheduleTime, setScheduleTime] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const editLoadRef = useRef<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [permalink, setPermalink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = listings.find((l) => l.id === selectedId) || null;
  const allImages = selected?.image_urls || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter(
      (l) =>
        l.title?.toLowerCase().includes(q) ||
        l.island?.toLowerCase().includes(q) ||
        l.source_name?.toLowerCase().includes(q)
    );
  }, [listings, search]);

  const loadState = () => {
    return Promise.all([
      apiFetch<{ listings: Listing[]; published: PublishedPost[]; instagram: { configured: boolean } }>("GET"),
      apiFetch<{ items: QueueItem[] }>("POST", { action: "list_queue" }),
    ]).then(([{ listings: ls, published: ps, instagram }, { items }]) => {
      setListings(ls);
      setPublished(ps || []);
      setIgConfigured(instagram.configured);
      setQueue(items || []);
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
    if (filtered.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }

    if (!filtered.some((l) => l.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setPermalink("");
    setError("");
    setNotice("");

    // Loading a queued post for editing — use its saved caption/images
    // instead of regenerating.
    const edit = editLoadRef.current;
    if (edit && edit.listing_id === selectedId) {
      setCaption(edit.caption);
      setSelectedImages(edit.image_urls.slice(0, 10));
      editLoadRef.current = null;
      return;
    }

    // Manual listing pick — not editing anything.
    setEditingQueueId(null);
    setCaption("");
    const imgs = listings.find((l) => l.id === selectedId)?.image_urls || [];
    setSelectedImages(imgs.slice(0, 10));

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

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    let closest = dragIndex;
    let closestDist = Infinity;
    selectedImages.forEach((_, idx) => {
      const el = cellRefs.current[idx];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientX - cx) + Math.abs(e.clientY - cy);
      if (dist < closestDist) { closestDist = dist; closest = idx; }
    });
    if (closest !== dragIndex) didDragRef.current = true;
    setDropIndex(closest);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      setSelectedImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  // "Publish now" enqueues for immediate background sending (scheduled_at = now)
  // and returns instantly — the cron picks it up within ~a minute. No 20-30s wait.
  const handlePublish = async () => {
    if (!selectedId || !caption.trim() || selectedImages.length < 2) return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("POST", {
        action: "queue_carousel",
        listingId: selectedId,
        imageUrls: selectedImages,
        caption: caption.trim(),
        scheduledAt: new Date().toISOString(),
        listingTitle: selected?.title || null,
      });
      setNotice("Sending in the background — it'll appear in Published within a minute. You can keep working.");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedId || !caption.trim() || selectedImages.length < 2 || !scheduleTime) return;
    setScheduling(true);
    setError("");
    setNotice("");
    try {
      if (editingQueueId) {
        await apiFetch("POST", {
          action: "update_queue",
          queueId: editingQueueId,
          listingId: selectedId,
          imageUrls: selectedImages,
          caption: caption.trim(),
          scheduledAt: new Date(scheduleTime).toISOString(),
        });
        setNotice("Queue item updated.");
        setEditingQueueId(null);
      } else {
        await apiFetch("POST", {
          action: "queue_carousel",
          listingId: selectedId,
          imageUrls: selectedImages,
          caption: caption.trim(),
          scheduledAt: new Date(scheduleTime).toISOString(),
        });
        setNotice("Added to queue.");
      }
      setShowSchedule(false);
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  const handleEditQueueItem = (item: QueueItem) => {
    setEditingQueueId(item.id);
    setScheduleTime(toDatetimeLocal(new Date(item.scheduled_at)));
    setShowSchedule(true);
    setError("");
    setNotice("");
    if (selectedId === item.listing_id) {
      // Same listing already selected — the [selectedId] effect won't fire.
      setCaption(item.caption);
      setSelectedImages(item.image_urls.slice(0, 10));
    } else {
      editLoadRef.current = item;
      setSelectedId(item.listing_id);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingQueueId(null);
    setShowSchedule(false);
    setNotice("");
  };

  const handleRemoveFromQueue = async (id: string) => {
    try {
      await apiFetch("POST", { action: "remove_from_queue", queueId: id });
      setQueue((prev) => prev.filter((q) => q.id !== id));
      if (editingQueueId === id) setEditingQueueId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const applyNextSlot = (pattern: SchedulePattern) => {
    const taken = queue.filter((q) => q.status === "pending").map((q) => q.scheduled_at);
    setScheduleTime(toDatetimeLocal(nextSlot(pattern, taken)));
  };

  const handlePatternChange = (p: SchedulePattern) => {
    setSchedulePattern(p);
    localStorage.setItem("ig_schedule_pattern", p);
    applyNextSlot(p);
  };

  if (loading) {
    return <div className="py-12 text-foreground-muted font-mono">Loading listings...</div>;
  }

  const canPublish = igConfigured && selectedId && caption.trim() && selectedImages.length >= 2 && !publishing;
  const canSchedule = selectedId && caption.trim() && selectedImages.length >= 2 && scheduleTime && !scheduling;

  return (
    <div className="space-y-6">
      <section>
        <div className="label-style mb-1">Marketing &gt; Instagram</div>
        <h2 className="text-2xl font-semibold text-foreground font-mono mb-1">Marketing</h2>
        <p className="text-sm text-foreground-muted">
          Pick a listing, select images, and publish or schedule an Instagram carousel.
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
              <div
                className="grid grid-cols-8 gap-1"
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
              >
                {[
                  ...selectedImages,
                  ...allImages.filter((u) => !selectedImages.includes(u)),
                ].map((url) => {
                  const position = selectedImages.indexOf(url);
                  const active = position >= 0;
                  const isDragging = dragIndex === position && active;
                  const isDropTarget = dropIndex === position && dragIndex !== null && dragIndex !== position && active;
                  return (
                    <div
                      key={url}
                      ref={active ? (el) => { cellRefs.current[position] = el; } : undefined}
                      className={`relative aspect-square overflow-hidden rounded-sm ${
                        active ? "cursor-grab" : ""
                      } ${isDragging ? "opacity-40 ring-2 ring-foreground" : ""} ${
                        isDropTarget ? "ring-2 ring-green" : ""
                      }`}
                      onPointerDown={active ? (e) => {
                        e.preventDefault();
                        didDragRef.current = false;
                        setDragIndex(position);
                        setDropIndex(position);
                      } : undefined}
                    >
                      <img
                        src={previewImageUrl(url)}
                        alt=""
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          if (didDragRef.current) { didDragRef.current = false; return; }
                          toggleImage(url);
                        }}
                        className={`w-full h-full object-cover transition-opacity cursor-pointer select-none ${
                          active ? "" : "grayscale opacity-25"
                        }`}
                      />
                      {active && (
                        <div className="absolute inset-0 ring-2 ring-inset ring-green pointer-events-none rounded-sm" />
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedImages.length < 2 && (
                <p className="text-amber text-[11px] font-mono mt-2">Select at least 2 images.</p>
              )}
              {selectedImages.length >= 2 && (
                <p className="text-foreground-muted text-[11px] font-mono mt-2">Drag selected images to reorder · number = carousel position.</p>
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
            {editingQueueId && (
              <div className="flex items-center justify-between gap-3 border border-green/40 bg-green/10 text-green px-3 py-2 text-[11px] font-mono rounded">
                <span>Editing a queued post — make changes, then Save changes below.</span>
                <button type="button" onClick={cancelEdit} className="underline hover:no-underline">Cancel</button>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish}
                className="flex-1 min-w-[160px] px-4 py-2.5 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
              >
                {publishing
                  ? "Sending…"
                  : `Publish now (${selectedImages.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!showSchedule) applyNextSlot(schedulePattern);
                  setShowSchedule((v) => !v);
                }}
                disabled={selectedImages.length < 2 || !caption.trim()}
                className="px-4 py-2.5 text-sm font-semibold rounded border border-border text-foreground hover:bg-surface-1 transition-all disabled:opacity-40 font-mono"
              >
                Schedule
              </button>
              <div className="text-xs font-mono text-foreground-muted whitespace-nowrap ml-auto">
                Instagram: {igConfigured
                  ? <span className="text-green">configured</span>
                  : <span className="text-red">not configured</span>}
              </div>
            </div>
            {showSchedule && (
              <div className="border border-border rounded p-3 space-y-3 bg-background">
                <div className="label-style">Post frequency</div>
                <div className="grid grid-cols-3 gap-2">
                  {SCHEDULE_PATTERNS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handlePatternChange(p.value)}
                      className={`px-2 py-2 text-[11px] font-mono rounded border text-left transition-all ${
                        schedulePattern === p.value
                          ? "border-foreground text-foreground bg-surface-1"
                          : "border-border text-foreground-muted hover:border-foreground/40"
                      }`}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-foreground-muted mt-0.5 text-[10px]">{p.desc}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="label-style mb-1">Next slot <span className="font-normal normal-case text-foreground-muted">(override if needed)</span></div>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded w-full"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!canSchedule}
                    className="flex-1 px-4 py-2 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
                  >
                    {scheduling
                      ? "Saving..."
                      : editingQueueId ? "Save changes" : "Add to queue"}
                  </button>
                  {editingQueueId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[11px] font-mono text-foreground-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {queue.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground font-mono">Queue ({queue.length})</h3>
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="surface-1 border border-border rounded p-3 text-xs font-mono flex items-start justify-between gap-4">
                <div className="flex gap-3 items-start min-w-0">
                  {item.image_urls?.[0] && (
                    <img
                      src={previewImageUrl(item.image_urls[0], 96)}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-foreground truncate">{item.listing_title || item.listing_id}</div>
                    <div className="text-foreground-muted mt-0.5">
                      {new Date(item.scheduled_at).toLocaleString()} · {item.image_urls.length} images
                    </div>
                    {item.status === "failed" && item.error_message && (
                      <div className="text-red mt-0.5 truncate">{item.error_message}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === "pending" ? "bg-amber/20 text-amber" :
                    item.status === "published" ? "bg-green/20 text-green" :
                    "bg-red/20 text-red"
                  }`}>{item.status}</span>
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditQueueItem(item)}
                        className={`transition-colors ${editingQueueId === item.id ? "text-green" : "text-foreground-muted hover:text-foreground"}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="text-foreground-muted hover:text-red transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {published.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground font-mono">Published ({published.length})</h3>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Clear all published history? Listings will reappear in the picker.")) return;
                try {
                  await apiFetch("POST", { action: "clear_published" });
                  await loadState();
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
              className="text-[11px] font-mono text-foreground-muted hover:text-red transition-colors"
            >
              Reset history
            </button>
          </div>
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
                  <img
                    src={previewImageUrl(post.image_urls[0], 360)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full aspect-square object-cover rounded"
                  />
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
