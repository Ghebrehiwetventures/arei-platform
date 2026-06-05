/**
 * AREI Pulse — shared types and insert helper.
 *
 * AREI Pulse is the executive intelligence layer ("AI vice CEO /
 * chief of staff"). It synthesizes the most important company-level
 * signals into at most 5 cards per day and writes them to pulse_cards
 * (migration 050). The admin dashboard reads from the same table.
 *
 * Scope guardrails (do not violate):
 *   - Executive-level only. No Listings Pulse, no Source Health Pulse,
 *     no per-source/per-parser detail panels.
 *   - Summarized data-quality risk is allowed ONLY when it affects
 *     company-level priorities (category 'data_quality_risk').
 *   - This is NOT Eloy's data-cleaning agent and must not duplicate it.
 *   - No card without evidence. The generator drops any synthesized
 *     card whose evidence array is empty.
 *
 * Writes use the service role key (the nightly generator). The browser
 * never inserts — see migration 050 RLS.
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Executive taxonomy. Keep in exact sync with the CHECK constraint in
 * migration 050_pulse_cards.sql and the admin PulseCategory union.
 */
export const PULSE_CATEGORIES = [
  "strategy",
  "operations",
  "technical_execution",
  "data_quality_risk",
  "sales",
  "partnerships",
  "market_expansion",
  "events",
  "competitors",
  "content_pr",
  "fundraising",
] as const;

export type PulseCategory = (typeof PULSE_CATEGORIES)[number];

export type PulseSourceType = "internal" | "web" | "mixed";

/** A single grounding fact behind a card. Drawn from provided signals. */
export interface PulseEvidence {
  /** Short human label, e.g. "New broker leads (24h)". */
  label: string;
  /** Optional pointer to the originating signal id or entity. */
  ref?: string;
  /** Optional supporting value/detail, e.g. "3 leads, 1 from a verified agency". */
  detail?: string;
}

export interface PulseCardInsert {
  digest_date: string; // YYYY-MM-DD
  category: PulseCategory;
  /** 0-100, higher = more business impact. */
  priority: number;
  title: string;
  signal_summary: string;
  why_it_matters: string;
  recommended_action: string;
  /** Never empty for generator writes. */
  evidence: PulseEvidence[];
  source_type?: PulseSourceType | null;
  source_url?: string | null;
  owner_suggestion?: string | null;
  meta?: Record<string, unknown>;
}

/** True when `c` is a structurally valid executive card. */
export function isValidCategory(c: string): c is PulseCategory {
  return (PULSE_CATEGORIES as readonly string[]).includes(c);
}

/**
 * Insert a batch of executive Pulse cards for one digest date.
 *
 * Returns the number of rows successfully inserted. Does not throw on a
 * row-level failure — a single bad card must never abort the digest.
 */
export async function insertPulseCards(
  sb: SupabaseClient,
  cards: PulseCardInsert[]
): Promise<number> {
  if (cards.length === 0) return 0;

  const payload = cards.map((c) => ({
    digest_date: c.digest_date,
    category: c.category,
    priority: c.priority,
    title: c.title,
    signal_summary: c.signal_summary,
    why_it_matters: c.why_it_matters,
    recommended_action: c.recommended_action,
    evidence: c.evidence ?? [],
    source_type: c.source_type ?? null,
    source_url: c.source_url ?? null,
    owner_suggestion: c.owner_suggestion ?? null,
    meta: c.meta ?? {},
  }));

  const { data, error } = await sb
    .from("pulse_cards")
    .insert(payload)
    .select("id");

  if (error) {
    console.warn(`[pulse] insert failed: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Count cards already written for a digest date. Used to make the
 * nightly generator idempotent (skip unless --force).
 */
export async function countPulseCardsForDate(
  sb: SupabaseClient,
  digestDate: string
): Promise<number> {
  const { count, error } = await sb
    .from("pulse_cards")
    .select("id", { count: "exact", head: true })
    .eq("digest_date", digestDate);

  if (error) {
    console.warn(`[pulse] count failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

/**
 * Clear same-day cards that are still 'new' with no feedback, so a
 * --force regenerate doesn't duplicate. Operator-touched cards (done /
 * dismissed / feedback) are preserved.
 */
export async function clearFreshPulseCardsForDate(
  sb: SupabaseClient,
  digestDate: string
): Promise<number> {
  const { data, error } = await sb
    .from("pulse_cards")
    .delete()
    .eq("digest_date", digestDate)
    .eq("status", "new")
    .is("feedback", null)
    .select("id");

  if (error) {
    console.warn(`[pulse] clear failed: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Operator feedback distilled for the generator prompt. This is how Pulse
 * "gets better over time": past 👍/👎 and dismissals are fed back in so the
 * model favours what the operator found useful and avoids what they
 * rejected — without changing any facts.
 */
export interface FeedbackContext {
  /** Titles of recently up-voted cards (style/topics to favour). */
  useful: string[];
  /** Titles of recently down-voted cards (style/topics to avoid). */
  notUseful: string[];
  /** Titles recently dismissed (do not resurface the same suggestion). */
  dismissed: string[];
}

interface FeedbackRow {
  title: string;
}

/**
 * Read recent operator feedback (service role). Bounded by lookback window
 * and per-bucket caps so the prompt stays small. Degrades to empty arrays
 * on any error — feedback must never block a digest.
 */
export async function fetchFeedbackContext(
  sb: SupabaseClient,
  lookbackDays = 21,
  perBucket = 12
): Promise<FeedbackContext> {
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString();

  const empty: FeedbackContext = { useful: [], notUseful: [], dismissed: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function titles(apply: (q: any) => any): Promise<string[]> {
    // Build then run the query; tolerate any failure.
    try {
      const base = sb
        .from("pulse_cards")
        .select("title")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(perBucket);
      const { data, error } = (await (apply(base) as unknown as Promise<{
        data: FeedbackRow[] | null;
        error: { message: string } | null;
      }>));
      if (error) {
        console.warn(`[pulse] feedback fetch failed: ${error.message}`);
        return [];
      }
      // De-duplicate titles, drop empties.
      return Array.from(
        new Set((data ?? []).map((r) => r.title).filter((t) => !!t && t.trim()))
      );
    } catch (e) {
      console.warn(`[pulse] feedback fetch error: ${String(e)}`);
      return [];
    }
  }

  try {
    const [useful, notUseful, dismissed] = await Promise.all([
      titles((q) => (q as any).eq("feedback", "up")),
      titles((q) => (q as any).eq("feedback", "down")),
      titles((q) => (q as any).eq("status", "dismissed")),
    ]);
    return { useful, notUseful, dismissed };
  } catch {
    return empty;
  }
}
