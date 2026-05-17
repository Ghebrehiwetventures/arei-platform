import { useEffect, useState } from "react";
import {
  approveMarketNewsSocialDraft,
  fetchMarketNewsSocialState,
  generateMarketNewsSocialDrafts,
  publishInstagramSocialDraft,
  rejectMarketNewsSocialDraft,
  resetMarketNewsSocialDraft,
  updateMarketNewsSocialDraft,
  upsertDraft,
  type MarketNewsItem,
  type MarketNewsSocialDraft,
  type SocialAgentConfig,
  type SocialDraftType,
  type SocialPublishStatus,
} from "./socialMarketNews";

const socialDraftLabels: Record<SocialDraftType, string> = {
  instagram_feed_caption: "Instagram feed caption",
  instagram_story_outline: "Instagram story outline",
  instagram_carousel_outline: "Instagram carousel outline",
  linkedin_post: "LinkedIn post",
  x_post: "X post",
};

const publishStatusLabels: Record<SocialPublishStatus, string> = {
  not_published: "Not published",
  not_configured: "Not configured",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

const defaultSocialAgentConfig: SocialAgentConfig = {
  llm: { openaiConfigured: false, anthropicConfigured: false, defaultProvider: null },
  instagram: { configured: false, hasDefaultImageUrl: false, requiresImageUrl: true },
};

function SocialStatusBadge({ value }: { value: string }) {
  const classes =
    value === "approved" || value === "published"
      ? "bg-green/15 text-green border-green"
      : value === "rejected" || value === "failed"
        ? "bg-red/15 text-red border-red"
        : value === "not_configured" || value === "revision_requested"
          ? "bg-amber/15 text-amber border-amber"
          : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {value}
    </span>
  );
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getItemDrafts(drafts: MarketNewsSocialDraft[], itemId: string): MarketNewsSocialDraft[] {
  const order: Record<SocialDraftType, number> = {
    instagram_feed_caption: 1,
    instagram_story_outline: 2,
    instagram_carousel_outline: 3,
    linkedin_post: 4,
    x_post: 5,
  };
  return drafts
    .filter((draft) => draft.market_news_item_id === itemId)
    .sort((a, b) => order[a.draft_type] - order[b.draft_type]);
}

function canPublishInstagram(draft: MarketNewsSocialDraft, config: SocialAgentConfig): { ok: boolean; reason: string } {
  if (draft.platform !== "instagram" || draft.draft_type !== "instagram_feed_caption") {
    return { ok: false, reason: "Only Instagram feed captions can be published here." };
  }
  if (draft.approval_status !== "approved") {
    return { ok: false, reason: "Approve the Instagram feed caption before publishing." };
  }
  if (!draft.source_url) {
    return { ok: false, reason: "Source URL is required before publishing." };
  }
  if (!config.instagram.configured) {
    return { ok: false, reason: "Instagram publishing not configured." };
  }
  if (!draft.media_url && !config.instagram.hasDefaultImageUrl) {
    return { ok: false, reason: "Instagram publishing requires a draft media URL or INSTAGRAM_DEFAULT_IMAGE_URL." };
  }
  if (draft.publish_status === "publishing") {
    return { ok: false, reason: "Publish already in progress." };
  }
  if (draft.publish_status === "published") {
    return { ok: false, reason: "Already published." };
  }
  return { ok: true, reason: "" };
}

export function MarketNewsSocialAgentView() {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [drafts, setDrafts] = useState<MarketNewsSocialDraft[]>([]);
  const [config, setConfig] = useState<SocialAgentConfig>(defaultSocialAgentConfig);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "">("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;
  const selectedDrafts = selectedItemId ? getItemDrafts(drafts, selectedItemId) : [];

  useEffect(() => {
    let cancelled = false;
    fetchMarketNewsSocialState()
      .then((state) => {
        if (cancelled) return;
        const nextItems = state.items || [];
        const nextConfig = state.config || defaultSocialAgentConfig;
        setItems(nextItems);
        setDrafts(state.drafts || []);
        setConfig(nextConfig);
        setWarnings(state.warnings || []);
        setSelectedItemId((current) => current || nextItems[0]?.id || "");
        setProvider(nextConfig.llm.defaultProvider || "");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceDraft = (draft: MarketNewsSocialDraft) => {
    setDrafts((current) => upsertDraft(current, draft));
  };

  const handleGenerate = async () => {
    if (!selectedItemId) return;
    setBusy("generate");
    setError("");
    setNotice("");
    try {
      const result = await generateMarketNewsSocialDrafts({
        itemId: selectedItemId,
        provider,
        mediaUrl,
      });
      setConfig(result.config);
      setDrafts((current) => [
        ...result.drafts,
        ...current.filter(
          (draft) =>
            draft.market_news_item_id !== selectedItemId ||
            draft.publish_status === "published"
        ),
      ]);
      setNotice("Generated social draft variants for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handleSave = async (draft: MarketNewsSocialDraft) => {
    setBusy(`save:${draft.id}`);
    setError("");
    setNotice("");
    try {
      const result = await updateMarketNewsSocialDraft(draft.id, draft.editable_text);
      replaceDraft(result.draft);
      setNotice("Draft saved. Approval resets automatically when approved text changes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handleApprove = async (draft: MarketNewsSocialDraft) => {
    setBusy(`approve:${draft.id}`);
    setError("");
    setNotice("");
    try {
      const saved = await updateMarketNewsSocialDraft(draft.id, draft.editable_text);
      const result = await approveMarketNewsSocialDraft(saved.draft.id);
      replaceDraft(result.draft);
      setNotice("Draft approved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handleReject = async (draft: MarketNewsSocialDraft) => {
    setBusy(`reject:${draft.id}`);
    setError("");
    setNotice("");
    try {
      const result = await rejectMarketNewsSocialDraft(draft.id);
      replaceDraft(result.draft);
      setNotice("Draft rejected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handleReset = async (draft: MarketNewsSocialDraft) => {
    setBusy(`reset:${draft.id}`);
    setError("");
    setNotice("");
    try {
      const result = await resetMarketNewsSocialDraft(draft.id);
      replaceDraft(result.draft);
      setNotice("Draft reset to pending review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handlePublishInstagram = async (draft: MarketNewsSocialDraft) => {
    const publishCheck = canPublishInstagram(draft, config);
    if (!publishCheck.ok) {
      setError(publishCheck.reason);
      return;
    }
    setBusy(`publish:${draft.id}`);
    setError("");
    setNotice("");
    try {
      const result = await publishInstagramSocialDraft(draft.id, mediaUrl);
      replaceDraft(result.draft);
      setNotice("Instagram publish completed and status was recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const handleCopy = async (draft: MarketNewsSocialDraft) => {
    await navigator.clipboard.writeText(draft.editable_text);
    setNotice(`Copied ${socialDraftLabels[draft.draft_type]}.`);
  };

  const handleDraftTextChange = (draftId: string, value: string) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              editable_text: value,
              ...(draft.approval_status === "approved"
                ? {
                    approval_status: "pending" as const,
                    approved_by: null,
                    approved_at: null,
                    publish_status: draft.publish_status === "published" ? draft.publish_status : ("not_published" as const),
                  }
                : {}),
            }
          : draft
      )
    );
  };

  if (loading) {
    return <div className="py-12 text-foreground-muted font-mono">Loading Market News social agent...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="label-style mb-2">Market Intelligence &gt; Social Drafts</div>
        <h2 className="text-2xl font-semibold text-foreground font-mono mb-1">
          Market News Social Agent
        </h2>
        <p className="text-sm text-foreground-muted max-w-4xl">
          Cape Verde only. Generate platform drafts, edit, approve, and publish only approved Instagram feed captions when server-side Instagram credentials are configured.
        </p>
      </section>

      {(warnings.length > 0 || error || notice) && (
        <section className="space-y-2">
          {warnings.map((warning) => (
            <div key={warning} className="border border-amber bg-amber/10 text-amber p-3 text-sm font-mono">
              {warning}
            </div>
          ))}
          {error && <div className="border border-red bg-red/10 text-red p-3 text-sm font-mono">{error}</div>}
          {notice && <div className="border border-green bg-green/10 text-green p-3 text-sm font-mono">{notice}</div>}
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="surface-1 rounded border border-border p-4 space-y-4">
          <div>
            <div className="label-style mb-1">Market News item</div>
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
            >
              {items.length === 0 && <option value="">No Cape Verde Market News items found</option>}
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sourceTitle || item.id}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="label-style mb-1">Source context</div>
                <h3 className="text-lg font-semibold text-foreground font-mono">
                  {selectedItem.sourceTitle}
                </h3>
                <p className="text-foreground-muted mt-1">
                  {selectedItem.sourceName || "Missing source name"} · {selectedItem.category || "Uncategorized"}
                </p>
                {selectedItem.sourceUrl ? (
                  <a
                    href={selectedItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green break-all font-mono text-xs"
                  >
                    {selectedItem.sourceUrl}
                  </a>
                ) : (
                  <p className="text-red font-mono text-xs">Missing source URL</p>
                )}
              </div>
              <div>
                <div className="label-style mb-1">What happened</div>
                <p className="font-mono text-foreground whitespace-pre-wrap">{selectedItem.whatHappened || "-"}</p>
              </div>
              <div>
                <div className="label-style mb-1">Why it matters</div>
                <p className="font-mono text-foreground whitespace-pre-wrap">{selectedItem.whyItMatters || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label-style mb-1">Country</div>
                  <div className="font-mono text-foreground">{selectedItem.country || "Cape Verde"}</div>
                </div>
                <div>
                  <div className="label-style mb-1">Published</div>
                  <div className="font-mono text-foreground">{formatDateLabel(selectedItem.publishedAt)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-style block mb-1">LLM provider</label>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as "openai" | "anthropic" | "")}
                  className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
                >
                  <option value="">Safe default</option>
                  <option value="openai" disabled={!config.llm.openaiConfigured}>
                    OpenAI / ChatGPT {config.llm.openaiConfigured ? "" : "(not configured)"}
                  </option>
                  <option value="anthropic" disabled={!config.llm.anthropicConfigured}>
                    Claude {config.llm.anthropicConfigured ? "" : "(not configured)"}
                  </option>
                </select>
              </div>
              <div>
                <label className="label-style block mb-1">Instagram media URL</label>
                <input
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                  placeholder={config.instagram.hasDefaultImageUrl ? "Using default image if blank" : "Public image URL required to publish"}
                  className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedItemId || busy === "generate"}
              className="px-4 py-2 text-sm font-medium rounded bg-foreground text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {busy === "generate" ? "Generating..." : selectedDrafts.length > 0 ? "Regenerate social drafts" : "Generate social drafts"}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-foreground-muted">
              <div>OpenAI: {config.llm.openaiConfigured ? "configured" : "not configured"}</div>
              <div>Claude: {config.llm.anthropicConfigured ? "configured" : "not configured"}</div>
              <div>Instagram: {config.instagram.configured ? "configured" : "not configured"}</div>
              <div>Default media: {config.instagram.hasDefaultImageUrl ? "configured" : "not configured"}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedDrafts.length === 0 && (
            <div className="border border-border bg-surface-1 rounded p-6 text-sm font-mono text-foreground-muted">
              No social drafts for this Market News item yet.
            </div>
          )}

          {selectedDrafts.map((draft) => {
            const publishCheck = canPublishInstagram(draft, config);
            const isInstagramFeed = draft.draft_type === "instagram_feed_caption";
            const canEdit = draft.publish_status !== "published";
            return (
              <article key={draft.id} className="surface-1 rounded border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="label-style mb-1">{draft.platform}</div>
                    <h3 className="text-lg font-semibold text-foreground font-mono">
                      {socialDraftLabels[draft.draft_type]}
                    </h3>
                    <p className="text-xs text-foreground-muted font-mono">
                      {draft.model_provider || "unknown provider"} · {draft.prompt_version}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SocialStatusBadge value={draft.approval_status} />
                    <SocialStatusBadge value={publishStatusLabels[draft.publish_status]} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
                  <div>
                    <label className="label-style block mb-1">Editable draft</label>
                    <textarea
                      value={draft.editable_text}
                      onChange={(event) => handleDraftTextChange(draft.id, event.target.value)}
                      disabled={!canEdit}
                      rows={draft.draft_type === "x_post" ? 5 : 9}
                      className="w-full bg-background border border-border text-foreground p-3 text-sm font-mono leading-relaxed rounded disabled:opacity-70"
                    />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <div className="label-style mb-1">Approved</div>
                      <div>{draft.approved_by || "-"}</div>
                      <div className="text-foreground-muted">{formatDateLabel(draft.approved_at)}</div>
                    </div>
                    <div>
                      <div className="label-style mb-1">Publish</div>
                      <div>{draft.publish_status}</div>
                      <div className="text-foreground-muted">{formatDateLabel(draft.publish_attempted_at)}</div>
                    </div>
                    {draft.external_platform_permalink && (
                      <a
                        href={draft.external_platform_permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green break-all"
                      >
                        Open published post
                      </a>
                    )}
                    {draft.publish_error_message && (
                      <div className="border border-red bg-red/10 text-red p-2">
                        {draft.publish_error_message}
                      </div>
                    )}
                    {isInstagramFeed && !publishCheck.ok && (
                      <div className="border border-amber bg-amber/10 text-amber p-2">
                        {publishCheck.reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleCopy(draft)}
                    className="px-3 py-2 text-xs font-medium rounded border border-border hover:bg-surface-2 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(draft)}
                    disabled={!canEdit || busy === `save:${draft.id}`}
                    className="px-3 py-2 text-xs font-medium rounded border border-border hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    Save edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(draft)}
                    disabled={!canEdit || busy === `approve:${draft.id}`}
                    className="px-3 py-2 text-xs font-medium rounded border border-green text-green hover:bg-green hover:text-background transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(draft)}
                    disabled={!canEdit || busy === `reject:${draft.id}`}
                    className="px-3 py-2 text-xs font-medium rounded border border-red text-red hover:bg-red hover:text-background transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReset(draft)}
                    disabled={!canEdit || busy === `reset:${draft.id}`}
                    className="px-3 py-2 text-xs font-medium rounded border border-border hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  {isInstagramFeed && (
                    <button
                      type="button"
                      onClick={() => handlePublishInstagram(draft)}
                      disabled={!publishCheck.ok || busy === `publish:${draft.id}`}
                      className="px-3 py-2 text-xs font-medium rounded border border-green text-green hover:bg-green hover:text-background transition-colors disabled:opacity-50"
                    >
                      {busy === `publish:${draft.id}` ? "Publishing..." : "Publish Instagram"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
