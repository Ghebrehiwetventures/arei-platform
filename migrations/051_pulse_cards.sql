-- ============================================================
-- Migration 051: AREI Pulse — executive intelligence cards
-- ============================================================
-- AREI Pulse is the executive intelligence layer: an AI "vice CEO /
-- chief of staff" that proactively surfaces the most important
-- strategic, operational, sales, market, partnership, event,
-- competitor and execution signals for the company.
--
-- It is NOT a technical notification center. Low-level listing,
-- parser, or source-health detail belongs in admin_notifications
-- (migration 036) and in Eloy's separate data-cleaning agent — NOT
-- here. Summarized data-quality risk may appear ONLY when it affects
-- company-level priorities.
--
-- One row = one executive card. The nightly generator
-- (scripts/generate_pulse_digest.ts) synthesizes at most 5 cards per
-- digest_date from internal signals (and, when a safe provider is
-- configured, external web intelligence). Every card MUST carry
-- evidence — there are no evidence-free cards by construction in the
-- generator, though the column is permissive at the DB layer.
--
-- Security model:
--   INSERT  — service role only (the nightly generator). Never browser.
--   SELECT  — authenticated (admin users) only. No anon access.
--   UPDATE  — authenticated only, and ONLY the `status` and `feedback`
--             columns. Enforced at the DB layer by a BEFORE UPDATE
--             trigger (pulse_cards_guard_update) that rejects any change
--             to generated content (title, priority, signal_summary,
--             evidence, etc.). Not merely an app-layer convention.
--   DELETE  — service role only (generator may clear same-day 'new'
--             cards on a --force regenerate). No browser delete.
--
-- Safe to re-run: IF NOT EXISTS / CREATE IF NOT EXISTS guards, plus
-- CREATE OR REPLACE FUNCTION and DROP TRIGGER IF EXISTS for the guard.
--
-- Sequence check: 050 is the highest migration at time of writing
-- (050_market_briefings_admin). This is 051.
-- ============================================================

create table if not exists public.pulse_cards (
  id                 uuid        primary key default gen_random_uuid(),

  -- The digest this card belongs to. One operator-facing feed per day.
  digest_date        date        not null,

  -- Executive area. Constrained to the agreed taxonomy so the UI can
  -- group/filter deterministically. New categories must be added here
  -- AND in scripts/lib/pulse.ts (PULSE_CATEGORIES).
  category           text        not null
                       check (category in (
                         'strategy',
                         'operations',
                         'technical_execution',
                         'data_quality_risk',
                         'sales',
                         'partnerships',
                         'market_expansion',
                         'events',
                         'competitors',
                         'content_pr',
                         'fundraising'
                       )),

  -- 0-100. Higher = more business impact / urgency. The feed sorts desc.
  priority           integer     not null
                       check (priority between 0 and 100),

  -- Card body (all required — a card with empty reasoning is not a card).
  title              text        not null,
  signal_summary     text        not null,
  why_it_matters     text        not null,
  recommended_action text        not null,

  -- Evidence the synthesis was grounded in. Array of
  -- { label, ref?, detail? } objects drawn from the provided signals.
  -- Never empty for generator-written rows (enforced in the script).
  evidence           jsonb       not null default '[]',

  -- Provenance of the dominant evidence source.
  --   'internal' — admin signals only
  --   'web'      — external web intelligence provider
  --   'mixed'    — both
  source_type        text
                       check (source_type in ('internal', 'web', 'mixed')),
  source_url         text,

  -- Suggested owner when inferable from context (e.g. 'Michael',
  -- 'Eloy'). Null when not confidently inferable.
  owner_suggestion   text,

  -- Operator lifecycle.
  status             text        not null default 'new'
                       check (status in ('new', 'done', 'dismissed')),

  -- Operator signal for tuning future digests. Null = no feedback yet.
  feedback           text
                       check (feedback in ('up', 'down')),

  -- Structured extra data for future drill-down / generator metadata
  -- (model, prompt_version, signal ids, etc).
  meta               jsonb       not null default '{}',

  created_at         timestamptz not null default now()
);

-- Today's feed: most important first.
create index if not exists pulse_cards_digest_idx
  on public.pulse_cards (digest_date desc, priority desc);

-- "Open work" query — new cards across recent digests.
create index if not exists pulse_cards_status_idx
  on public.pulse_cards (status, digest_date desc)
  where status = 'new';

-- Category filtering / analytics.
create index if not exists pulse_cards_category_idx
  on public.pulse_cards (category);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.pulse_cards enable row level security;

-- Authenticated admin users can read all cards. Anon has no access
-- (no policy = implicit deny).
drop policy if exists "authenticated_select_pulse_cards" on public.pulse_cards;
create policy "authenticated_select_pulse_cards"
  on public.pulse_cards
  for select
  to authenticated
  using (true);

-- Authenticated admin users can update rows (RLS allows the row), but a
-- BEFORE UPDATE trigger (below) restricts WHICH columns may change to
-- `status` and `feedback` only. The policy stays permissive at the row
-- level; the trigger enforces column-level least privilege.
drop policy if exists "authenticated_update_pulse_cards" on public.pulse_cards;
create policy "authenticated_update_pulse_cards"
  on public.pulse_cards
  for update
  to authenticated
  using (true)
  with check (true);

-- INSERT and DELETE are handled by the service role (the nightly
-- generator), which bypasses RLS. No anon/authenticated policies for
-- those verbs = implicit deny from the browser.

-- ── Column-level UPDATE guard ──────────────────────────────────────────────
-- Browser clients (the `authenticated` role) may ONLY change `status`
-- and `feedback`. Any attempt to alter generated content fields is
-- rejected. The service role (generator) is exempt — it owns
-- insert/delete and may evolve rows freely. This is DB-enforced and does
-- not depend on table/column GRANT state.
create or replace function public.pulse_cards_guard_update()
returns trigger
language plpgsql
as $$
begin
  -- Service role (and superuser/migration roles) bypass the guard.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- For everyone else (i.e. `authenticated`), only status + feedback
  -- may differ from the existing row. Everything else must be unchanged.
  if new.id                 is distinct from old.id
     or new.digest_date     is distinct from old.digest_date
     or new.category        is distinct from old.category
     or new.priority        is distinct from old.priority
     or new.title           is distinct from old.title
     or new.signal_summary  is distinct from old.signal_summary
     or new.why_it_matters  is distinct from old.why_it_matters
     or new.recommended_action is distinct from old.recommended_action
     or new.evidence        is distinct from old.evidence
     or new.source_type     is distinct from old.source_type
     or new.source_url      is distinct from old.source_url
     or new.owner_suggestion is distinct from old.owner_suggestion
     or new.meta            is distinct from old.meta
     or new.created_at      is distinct from old.created_at
  then
    raise exception
      'pulse_cards: role % may only update status and feedback', current_user
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

drop trigger if exists pulse_cards_guard_update_trg on public.pulse_cards;
create trigger pulse_cards_guard_update_trg
  before update on public.pulse_cards
  for each row
  execute function public.pulse_cards_guard_update();
