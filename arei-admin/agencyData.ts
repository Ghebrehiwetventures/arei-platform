import { supabase } from "./supabase";
import type {
  Agency,
  AgencyRelationship,
  AgencyWithRelationship,
} from "./types";

const nowIso = () => new Date().toISOString();

// ============================================================
// READ
// ============================================================

/**
 * Fetch all agencies joined with their relationship record.
 * Returns most recently updated first.
 */
export async function getAgenciesWithRelationships(): Promise<AgencyWithRelationship[]> {
  const { data: agencies, error: agencyErr } = await supabase
    .from("agencies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (agencyErr) throw agencyErr;
  if (!agencies || agencies.length === 0) return [];

  const agencyIds = agencies.map((a) => a.id);
  const { data: relationships, error: relErr } = await supabase
    .from("agency_relationships")
    .select("*")
    .in("agency_id", agencyIds);

  if (relErr) throw relErr;

  const relByAgencyId = new Map<string, AgencyRelationship>(
    (relationships ?? []).map((r) => [r.agency_id, r as AgencyRelationship])
  );

  return (agencies as Agency[]).map((agency) => ({
    ...agency,
    relationship: relByAgencyId.get(agency.id) ?? null,
  }));
}

// ============================================================
// CREATE / UPDATE: agencies
// ============================================================

export type AgencyInsert = Omit<Agency, "id" | "created_at" | "updated_at">;
export type AgencyUpdate = Partial<AgencyInsert>;

export async function createAgency(data: AgencyInsert): Promise<Agency> {
  const { data: row, error } = await supabase
    .from("agencies")
    .insert({ ...data, created_at: nowIso(), updated_at: nowIso() })
    .select()
    .single();

  if (error) throw error;
  return row as Agency;
}

export async function updateAgency(id: string, data: AgencyUpdate): Promise<Agency> {
  const { data: row, error } = await supabase
    .from("agencies")
    .update({ ...data, updated_at: nowIso() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row as Agency;
}

// ============================================================
// CREATE / UPDATE: agency_relationships (internal-only)
// ============================================================

export type RelationshipUpsert = Omit<AgencyRelationship, "id" | "created_at" | "updated_at">;

/** Create or update the internal relationship record for an agency (one per agency). */
export async function upsertAgencyRelationship(
  data: RelationshipUpsert
): Promise<AgencyRelationship> {
  const { data: row, error } = await supabase
    .from("agency_relationships")
    .upsert(
      { ...data, updated_at: nowIso() },
      { onConflict: "agency_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return row as AgencyRelationship;
}
