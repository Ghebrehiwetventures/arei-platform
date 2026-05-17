-- Market News -> Social Draft -> Approval -> Publish state.
-- Server-side admin API writes this table with service-role credentials.

CREATE TABLE IF NOT EXISTS public.market_news_social_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_news_item_id text NOT NULL,
  source_title text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  country text NOT NULL DEFAULT 'Cape Verde',
  region text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  what_happened text NOT NULL,
  why_it_matters text NOT NULL,
  platform text NOT NULL,
  draft_type text NOT NULL,
  generated_text text NOT NULL,
  editable_text text NOT NULL,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  publish_status text NOT NULL DEFAULT 'not_published',
  publish_attempted_at timestamptz,
  published_at timestamptz,
  external_platform_post_id text,
  external_platform_permalink text,
  publish_error_message text,
  model_provider text,
  model_name text,
  prompt_version text NOT NULL DEFAULT 'market-news-social-v1',
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_news_social_drafts_platform_check
    CHECK (platform IN ('instagram', 'linkedin', 'x')),
  CONSTRAINT market_news_social_drafts_draft_type_check
    CHECK (draft_type IN (
      'instagram_feed_caption',
      'instagram_story_outline',
      'instagram_carousel_outline',
      'linkedin_post',
      'x_post'
    )),
  CONSTRAINT market_news_social_drafts_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  CONSTRAINT market_news_social_drafts_publish_status_check
    CHECK (publish_status IN ('not_published', 'not_configured', 'publishing', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS market_news_social_drafts_item_idx
  ON public.market_news_social_drafts (market_news_item_id);

CREATE INDEX IF NOT EXISTS market_news_social_drafts_created_at_idx
  ON public.market_news_social_drafts (created_at DESC);

CREATE INDEX IF NOT EXISTS market_news_social_drafts_publish_status_idx
  ON public.market_news_social_drafts (publish_status);

ALTER TABLE public.market_news_social_drafts ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are created intentionally.
-- AREI Admin should access this table through server-side routes only.
