/**
 * AREI Pulse — internal signal collection.
 *
 * Gathers COMPANY-LEVEL signals from existing admin data. Pure data
 * collection: no LLM, no editorializing. The generator passes the
 * resulting bundle to Claude for synthesis.
 *
 * Guardrails:
 *   - Data quality appears ONLY as a single high-level summary
 *     (grade mix + conversion + freshness). No per-source rows, no
 *     parser detail — that is Eloy's data-cleaning agent's territory.
 *   - Every signal carries a stable `id` and human `label` so the
 *     synthesized cards can cite real evidence (no card without evidence).
 *
 * Each query degrades gracefully: a failed read yields a null/empty
 * signal rather than aborting the digest.
 */

import { SupabaseClient } from "@supabase/supabase-js";

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** A labeled, citable company-level signal. */
export interface PulseSignal {
  id: string;
  label: string;
  /** One-line factual summary, ready to drop into a prompt. */
  summary: string;
  /** Structured backing data for the synthesizer (optional). */
  data?: Record<string, unknown>;
}

export interface SignalBundle {
  generatedAt: string;
  signals: PulseSignal[];
}

function count<T>(rows: T[] | null | undefined): number {
  return rows?.length ?? 0;
}

// ── Individual collectors ────────────────────────────────────────────────────

async function collectNotifications(sb: SupabaseClient): Promise<PulseSignal | null> {
  const { data, error } = await sb
    .from("admin_notifications")
    .select("event_type,severity,title,created_at")
    .gte("created_at", sinceIso(7))
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return null;
  if (data.length === 0) {
    return {
      id: "notifications_7d",
      label: "System notifications (7d)",
      summary: "No admin notifications in the last 7 days.",
      data: { total: 0 },
    };
  }

  const byDomain: Record<string, number> = {};
  let critical = 0;
  let warning = 0;
  for (const n of data) {
    const domain = String(n.event_type ?? "unknown").split(".")[0];
    byDomain[domain] = (byDomain[domain] ?? 0) + 1;
    if (n.severity === "critical") critical++;
    else if (n.severity === "warning") warning++;
  }
  const criticalTitles = data
    .filter((n) => n.severity === "critical")
    .slice(0, 5)
    .map((n) => n.title);

  return {
    id: "notifications_7d",
    label: "System notifications (7d)",
    summary:
      `${data.length} notifications in 7d across ${Object.keys(byDomain).length} domains ` +
      `(${critical} critical, ${warning} warning). Domains: ` +
      Object.entries(byDomain)
        .map(([d, c]) => `${d}=${c}`)
        .join(", ") +
      ".",
    data: { total: data.length, critical, warning, byDomain, criticalTitles },
  };
}

async function collectDataQualitySummary(sb: SupabaseClient): Promise<PulseSignal | null> {
  // Latest snapshot date, then aggregate to a SUMMARY only. No per-source rows.
  const { data: latest, error: latestErr } = await sb
    .from("source_health_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (latestErr || !latest || latest.length === 0) return null;
  const snapshotDate = latest[0].snapshot_date as string;

  const { data, error } = await sb
    .from("source_health_snapshots")
    .select("health_grade,feed_conversion_pct,last_updated_at,market_id")
    .eq("snapshot_date", snapshotDate);

  if (error || !data || data.length === 0) return null;

  const gradeMix: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let convSum = 0;
  let stale = 0;
  const staleCutoff = Date.now() - 30 * DAY_MS;
  for (const r of data) {
    const g = String(r.health_grade);
    if (g in gradeMix) gradeMix[g]++;
    convSum += Number(r.feed_conversion_pct ?? 0);
    const lu = r.last_updated_at ? new Date(r.last_updated_at as string).getTime() : 0;
    if (!lu || lu < staleCutoff) stale++;
  }
  const total = data.length;
  const avgConv = total > 0 ? Math.round((convSum / total) * 10) / 10 : 0;
  const weak = gradeMix.C + gradeMix.D;

  return {
    id: "data_quality_summary",
    label: "Data quality health (summary)",
    summary:
      `As of ${snapshotDate}: ${total} sources graded ` +
      `A=${gradeMix.A} B=${gradeMix.B} C=${gradeMix.C} D=${gradeMix.D} ` +
      `(${weak} weak), avg feed conversion ${avgConv}%, ${stale} stale (>30d). ` +
      `Note: detailed remediation is owned by the data-cleaning agent; surface ` +
      `here only if it blocks company-level priorities (e.g. methodology credibility).`,
    data: { snapshotDate, total, gradeMix, weak, avgConv, stale },
  };
}

async function collectLeads(sb: SupabaseClient): Promise<PulseSignal | null> {
  const { data, error } = await sb
    .from("leads")
    .select("id,status,source,created_at")
    .gte("created_at", sinceIso(7))
    .order("created_at", { ascending: false });

  if (error) return null;
  const last24 = (data ?? []).filter(
    (l) => new Date(l.created_at as string).getTime() >= Date.now() - DAY_MS
  ).length;

  return {
    id: "leads_7d",
    label: "Broker/buyer leads (7d)",
    summary:
      `${count(data)} leads in 7d (${last24} in last 24h). ` +
      (count(data) === 0 ? "No inbound demand signal this week." : "Sales pipeline active."),
    data: { total7d: count(data), last24 },
  };
}

async function collectAgencies(sb: SupabaseClient): Promise<PulseSignal | null> {
  const { data, error } = await sb
    .from("agencies")
    .select("id,data_partner_status,claimed_status,created_at");

  if (error || !data) return null;

  const partner: Record<string, number> = {};
  const claimed: Record<string, number> = {};
  for (const a of data) {
    partner[a.data_partner_status as string] = (partner[a.data_partner_status as string] ?? 0) + 1;
    claimed[a.claimed_status as string] = (claimed[a.claimed_status as string] ?? 0) + 1;
  }
  const new7d = data.filter(
    (a) => new Date(a.created_at as string).getTime() >= Date.now() - 7 * DAY_MS
  ).length;

  return {
    id: "agencies_partnership",
    label: "Agency partnership pipeline",
    summary:
      `${data.length} agencies. Data-partner status: ` +
      Object.entries(partner).map(([k, v]) => `${k}=${v}`).join(", ") +
      `. Claimed status: ` +
      Object.entries(claimed).map(([k, v]) => `${k}=${v}`).join(", ") +
      `. ${new7d} new in 7d.`,
    data: { total: data.length, partner, claimed, new7d },
  };
}

async function collectContentCadence(sb: SupabaseClient): Promise<PulseSignal | null> {
  const { data, error } = await sb
    .from("social_listing_queue")
    .select("status,scheduled_at")
    .order("scheduled_at", { ascending: false })
    .limit(200);

  if (error || !data) return null;

  const pending = data.filter((r) => r.status === "pending").length;
  const failed = data.filter((r) => r.status === "failed").length;
  const published = data.filter((r) => r.status === "published");
  const lastPublished = published[0]?.scheduled_at as string | undefined;
  const daysSince = lastPublished
    ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / DAY_MS)
    : null;

  return {
    id: "content_cadence",
    label: "Content / social cadence",
    summary:
      `Social queue: ${pending} pending, ${failed} failed. ` +
      (daysSince === null
        ? "No published posts recorded."
        : `Last published ${daysSince}d ago.`) +
      (pending === 0 ? " No scheduled content — cadence may stall." : ""),
    data: { pending, failed, daysSinceLastPublished: daysSince },
  };
}

async function collectBriefings(sb: SupabaseClient): Promise<PulseSignal | null> {
  const { data, error } = await sb
    .from("market_briefings")
    .select("slug,period,status,published_at,snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(10);

  if (error || !data) return null;

  const published = data.filter((b) => b.status === "published");
  const drafts = data.filter((b) => b.status === "draft");
  const latestPub = published[0];
  const daysSince = latestPub?.published_at
    ? Math.floor((Date.now() - new Date(latestPub.published_at as string).getTime()) / DAY_MS)
    : null;

  return {
    id: "market_briefings",
    label: "Market briefings (editorial)",
    summary:
      (latestPub
        ? `Latest published briefing: ${latestPub.period} (${daysSince}d ago).`
        : "No published market briefing yet.") +
      ` ${drafts.length} draft(s) pending.`,
    data: {
      latestPublished: latestPub?.period ?? null,
      daysSincePublished: daysSince,
      draftCount: drafts.length,
    },
  };
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Collect all internal company-level signals. Failures degrade to
 * omitted signals — the bundle always returns whatever succeeded.
 */
export async function collectInternalSignals(sb: SupabaseClient): Promise<SignalBundle> {
  const results = await Promise.all([
    collectNotifications(sb),
    collectDataQualitySummary(sb),
    collectLeads(sb),
    collectAgencies(sb),
    collectContentCadence(sb),
    collectBriefings(sb),
  ]);

  const signals = results.filter((s): s is PulseSignal => s !== null);
  return {
    generatedAt: new Date().toISOString(),
    signals,
  };
}
