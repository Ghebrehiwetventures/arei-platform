-- =============================================================================
-- Migration: homepage_featured_selections
-- Admin-curated weekly featured listings for the kazaverde-web homepage.
-- One row per ISO week per market. Anon reads published rows only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.homepage_featured_selections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id     text        NOT NULL DEFAULT 'cv',
  iso_week      text        NOT NULL,          -- 'YYYY-WNN' e.g. '2026-W22'
  listing_ids   text[]      NOT NULL DEFAULT '{}',
  status        text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  note          text,                          -- optional editorial note
  created_by    text,                          -- admin email at save time
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (market_id, iso_week),
  CONSTRAINT listing_ids_max_4 CHECK (array_length(listing_ids, 1) IS NULL OR array_length(listing_ids, 1) <= 4)
);

CREATE INDEX IF NOT EXISTS homepage_featured_market_week_idx
  ON public.homepage_featured_selections (market_id, iso_week DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_homepage_featured()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_homepage_featured_updated_at
  BEFORE UPDATE ON public.homepage_featured_selections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_homepage_featured();

-- RLS
ALTER TABLE public.homepage_featured_selections ENABLE ROW LEVEL SECURITY;

-- Public (anon): only see published rows
CREATE POLICY "anon_read_published_featured"
  ON public.homepage_featured_selections
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Authenticated (admin): full read including drafts
CREATE POLICY "admin_read_all_featured"
  ON public.homepage_featured_selections
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated (admin): write
CREATE POLICY "admin_write_featured"
  ON public.homepage_featured_selections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
