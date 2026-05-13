/**
 * Shared admin notification helper for all AREI scripts.
 *
 * Any script that runs with the service role key can call
 * insertAdminNotification() to write to admin_notifications.
 * The admin UI and weekly digest read from the same table.
 *
 * Event type convention — reverse-domain dot notation:
 *   <domain>.<event_name>
 *
 * Known domains (add new ones here as they are implemented):
 *   market_news.*    — Market News ingestion and candidate lifecycle
 *   source_health.*  — Source grade drops, new sources added, health alerts
 *   ingestion.*      — Cross-market ingestion pipeline failures
 *   listing.*        — Listing quality warnings, bulk status changes
 *   broker.*         — New broker leads, agency registrations
 *   system.*         — General platform / script errors
 *
 * Known event types (document here when emitted for the first time):
 *   market_news.candidates_imported  — End of an ingest run; N new candidates
 *   market_news.source_error         — A single RSS/feed source failed
 *   source_health.grade_drop         — (future) A source grade fell below threshold
 *   ingestion.pipeline_failure       — (future) A full market pipeline failed
 *   listing.quality_warning          — (future) Bulk listing field coverage fell
 *   broker.new_lead                  — (future) A new lead submitted via broker portal
 *
 * Security: INSERT is service role only. Browser clients have SELECT
 * and UPDATE (read_at) via RLS — never INSERT. See migration 036.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationInsert {
  /** Dot-namespaced event identifier. Convention: <domain>.<event_name> */
  event_type: string;
  severity: NotificationSeverity;
  /** Short one-line title shown in the admin UI list. */
  title: string;
  /** Optional supporting detail shown below the title. */
  body?: string | null;
  /** Optional entity category this notification relates to. */
  entity_type?: string | null;
  /** Optional ID of the specific entity (UUID or slug). */
  entity_id?: string | null;
  /** Structured extra data for digest queries or future drill-down. */
  meta?: Record<string, unknown>;
}

/**
 * Insert a single admin notification row.
 *
 * Returns true on success, false on failure. Does NOT throw — a
 * notification failure must never abort the calling script.
 */
export async function insertAdminNotification(
  sb: SupabaseClient,
  n: NotificationInsert
): Promise<boolean> {
  const { error } = await sb.from("admin_notifications").insert({
    event_type:  n.event_type,
    severity:    n.severity,
    title:       n.title,
    body:        n.body        ?? null,
    entity_type: n.entity_type ?? null,
    entity_id:   n.entity_id   ?? null,
    meta:        n.meta        ?? {},
  });

  if (error) {
    console.warn(`[notifications] insert failed (${n.event_type}): ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Insert multiple notifications in sequence.
 *
 * Continues on individual failures — all rows are attempted regardless
 * of earlier errors. Returns the count of successfully inserted rows.
 */
export async function insertAdminNotifications(
  sb: SupabaseClient,
  notifications: NotificationInsert[]
): Promise<number> {
  let inserted = 0;
  for (const n of notifications) {
    const ok = await insertAdminNotification(sb, n);
    if (ok) inserted++;
  }
  return inserted;
}
