-- 052_market_briefings_v2.sql
--
-- Briefing v2 — "honest monthly listing signal". Adds the minimal editorial
-- fields for the leaner monthly report. NO confidence column (derived from the
-- snapshot at render time) and NO baseline column (derived from edition order).
--
-- Existing 'commentary' is reused as the "Key observations" section — no
-- dedicated column is added for it.
--
-- Sequence: 051 belongs to Pulse (051_pulse_cards.sql). This is 052.
--
-- Backward compatible: all new columns are nullable, so existing editions
-- (e.g. June 2026) remain readable and render the new sections only when set.

alter table public.market_briefings
  add column if not exists supply_price_note text,
  add column if not exists island_notes      text,
  add column if not exists news_items         jsonb;

-- news_items is a small editorial array (3-5 items), each:
--   { "title": text, "source": text, "url": text, "date": text, "note": text }
-- Manual, neutral context only — no auto-fetch, no causal/forecast claims.

-- Extend the column-restricted UPDATE grant from 050 so authenticated admins
-- can edit the new editorial fields. (INSERT remains full-column from 050.)
grant update (
  title,
  period,
  executive_summary,
  key_takeaways,
  commentary,
  methodology_note,
  supply_price_note,
  island_notes,
  news_items,
  status,
  published_at,
  published_by,
  updated_at
) on public.market_briefings to authenticated;
