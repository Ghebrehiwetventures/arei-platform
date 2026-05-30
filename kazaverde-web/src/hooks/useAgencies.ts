import { useEffect, useState } from "react";
import type { AgencyRow } from "arei-sdk";
import { arei } from "../lib/arei";

export type UseAgenciesResult = {
  agencies: AgencyRow[];
  loading: boolean;
  error: string | null;
};

export function useAgencies(): UseAgenciesResult {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await arei.getAgencies("cv");
        if (cancelled) return;
        setAgencies(rows);
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

  return { agencies, loading, error };
}
