import { useEffect, useState } from "react";
import type { AgencyRow, AgencyListingStats } from "arei-sdk";
import { arei } from "../lib/arei";

export type UseAgenciesResult = {
  agencies: AgencyRow[];
  /** Listing stats keyed by source_id. Empty until loaded; may be empty on error. */
  stats: Record<string, AgencyListingStats>;
  loading: boolean;
  error: string | null;
};

export function useAgencies(): UseAgenciesResult {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [stats, setStats] = useState<Record<string, AgencyListingStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // One round-trip each: agency rows + aggregated per-source stats.
        const [agencyRows, statsMap] = await Promise.all([
          arei.getAgencies("cv"),
          // Stats are enrichment — a failure here must not blank the page.
          arei.getAgencyListingStats().catch(() => ({} as Record<string, AgencyListingStats>)),
        ]);
        if (cancelled) return;
        setAgencies(agencyRows);
        setStats(statsMap);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load agencies");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { agencies, stats, loading, error };
}
