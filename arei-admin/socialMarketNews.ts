export type SocialPlatform = "instagram" | "linkedin" | "x";

export type SocialDraftType =
  | "instagram_feed_caption"
  | "instagram_story_outline"
  | "instagram_carousel_outline"
  | "linkedin_post"
  | "x_post";

export type SocialApprovalStatus = "pending" | "approved" | "rejected" | "revision_requested";

export type SocialPublishStatus = "not_published" | "not_configured" | "publishing" | "published" | "failed";

export interface MarketNewsItem {
  id: string;
  sourceTitle: string;
  sourceName: string;
  sourceUrl: string;
  country: string;
  region: string;
  category: string;
  tags: string[];
  whatHappened: string;
  whyItMatters: string;
  status: string;
  reviewStatus: string;
  publishedAt: string;
}

export interface MarketNewsSocialDraft {
  id: string;
  market_news_item_id: string;
  source_title: string;
  source_name: string;
  source_url: string;
  country: string;
  region: string | null;
  category: string | null;
  tags: string[] | null;
  what_happened: string;
  why_it_matters: string;
  platform: SocialPlatform;
  draft_type: SocialDraftType;
  generated_text: string;
  editable_text: string;
  approval_status: SocialApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  publish_status: SocialPublishStatus;
  publish_attempted_at: string | null;
  published_at: string | null;
  external_platform_post_id: string | null;
  external_platform_permalink: string | null;
  publish_error_message: string | null;
  model_provider: string | null;
  model_name: string | null;
  prompt_version: string;
  media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAgentConfig {
  llm: {
    openaiConfigured: boolean;
    anthropicConfigured: boolean;
    defaultProvider: "openai" | "anthropic" | null;
  };
  instagram: {
    configured: boolean;
    hasDefaultImageUrl: boolean;
    requiresImageUrl: boolean;
  };
}

export interface SocialAgentState {
  items: MarketNewsItem[];
  drafts: MarketNewsSocialDraft[];
  config: SocialAgentConfig;
  warnings: string[];
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Admin API returned non-JSON response with status ${response.status}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data as T;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMarketNewsSocialState(): Promise<SocialAgentState> {
  const response = await fetch("/api/social-market-news", {
    method: "GET",
    credentials: "include",
    headers: await authHeaders(),
  });
  return parseApiResponse<SocialAgentState>(response);
}

async function postAction<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/social-market-news", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  return parseApiResponse<T>(response);
}

export async function generateMarketNewsSocialDrafts(input: {
  itemId: string;
  provider?: "openai" | "anthropic" | "";
  mediaUrl?: string;
}): Promise<{ drafts: MarketNewsSocialDraft[]; config: SocialAgentConfig }> {
  return postAction({
    action: "generate",
    itemId: input.itemId,
    provider: input.provider || undefined,
    mediaUrl: input.mediaUrl || undefined,
  });
}

export async function updateMarketNewsSocialDraft(
  draftId: string,
  editableText: string
): Promise<{ draft: MarketNewsSocialDraft }> {
  return postAction({ action: "update", draftId, editableText });
}

export async function approveMarketNewsSocialDraft(draftId: string): Promise<{ draft: MarketNewsSocialDraft }> {
  return postAction({ action: "approve", draftId });
}

export async function rejectMarketNewsSocialDraft(draftId: string): Promise<{ draft: MarketNewsSocialDraft }> {
  return postAction({ action: "reject", draftId });
}

export async function resetMarketNewsSocialDraft(draftId: string): Promise<{ draft: MarketNewsSocialDraft }> {
  return postAction({ action: "reset", draftId });
}

export async function publishInstagramSocialDraft(
  draftId: string,
  mediaUrl?: string
): Promise<{ draft: MarketNewsSocialDraft }> {
  return postAction({ action: "publish_instagram", draftId, mediaUrl: mediaUrl || undefined });
}

export function upsertDraft(
  drafts: MarketNewsSocialDraft[],
  draft: MarketNewsSocialDraft
): MarketNewsSocialDraft[] {
  const exists = drafts.some((item) => item.id === draft.id);
  if (!exists) return [draft, ...drafts];
  return drafts.map((item) => (item.id === draft.id ? draft : item));
}
import { supabaseAuth } from "./supabase";
