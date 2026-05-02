-- AREI Pulse V1
-- Stores generated executive strategy briefings and durable project memory.
-- The feature is read-only with respect to production listings, approvals,
-- sources, GitHub, and website content. These tables are only for Pulse output
-- and manually maintained project context.

CREATE TABLE IF NOT EXISTS public.arei_pulse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  generated_by text,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  headline text,
  briefing jsonb,
  context_snapshot jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS arei_pulse_created_at_idx
  ON public.arei_pulse (created_at DESC);

CREATE INDEX IF NOT EXISTS arei_pulse_status_created_at_idx
  ON public.arei_pulse (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.arei_project_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  source text
);

CREATE INDEX IF NOT EXISTS arei_project_memory_created_at_idx
  ON public.arei_project_memory (created_at DESC);

CREATE INDEX IF NOT EXISTS arei_project_memory_tags_idx
  ON public.arei_project_memory USING gin (tags);

ALTER TABLE public.arei_pulse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arei_project_memory ENABLE ROW LEVEL SECURITY;

-- No browser grants are added. AREI Pulse reads and writes through the
-- server-side API using the Supabase service role after admin auth verification.
REVOKE ALL ON public.arei_pulse FROM anon, authenticated;
REVOKE ALL ON public.arei_project_memory FROM anon, authenticated;

INSERT INTO public.arei_project_memory (type, title, body, tags, source)
SELECT
  'strategy',
  'AREI Pulse seed context',
  'AREI is a normalized real estate data platform for fragmented African property markets. KazaVerde is Market 01 and should remain a read-only Cape Verde property index / market data surface. The operating focus is data quality, broker neutrality, source transparency, trust-preserving public feed discipline, and transaction/market data as the long-term moat.',
  ARRAY['arei', 'strategy', 'cape-verde', 'market-01', 'pulse'],
  'migration:028_arei_pulse'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.arei_project_memory
  WHERE source = 'migration:028_arei_pulse'
);
