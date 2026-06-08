import React, { useEffect, useState } from "react";
import { supabaseAuth } from "./supabase";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface SourceRow {
  source: string;
  total: number;
  full: number;
  snippet: number;
  unknown: number;
  known: number;
  ratePct: number | null;
  tier: "open" | "mixed" | "closed" | "unmeasured";
}

const TIER_STYLE: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  mixed: "bg-amber-100 text-amber-700",
  closed: "bg-[#C44A3A]/15 text-[#C44A3A]",
  unmeasured: "bg-surface-3 text-foreground-subtle",
};

export function SourceHealthView() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      const res = await fetch("/api/source-health", { credentials: "include", headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setSources(data.sources || []);
    })()
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [reload]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-foreground">Source Health</h1>
      <p className="text-sm text-foreground-muted mb-4">
        Which publishers give us the full article vs only a headline (paywall / bot-block / JS). Drives
        “pick the best open source per cluster” for enrichment.
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs font-mono">
        <button onClick={() => setReload((n) => n + 1)} className="px-2 py-1 rounded border border-border hover:bg-surface-2">↻ Refresh</button>
        <span className="text-foreground-subtle">{sources.length} sources</span>
      </div>

      {loading && <div className="text-sm text-foreground-muted">Loading…</div>}
      {error && <div className="text-sm text-[#C44A3A]">Error: {error}</div>}

      {!loading && !error && (
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle border-b border-border">
                <th className="text-left px-3 py-2">Source</th>
                <th className="text-right px-3 py-2">Articles</th>
                <th className="text-right px-3 py-2">Full</th>
                <th className="text-right px-3 py-2">Snippet</th>
                <th className="text-right px-3 py-2">Full-text rate</th>
                <th className="text-left px-3 py-2">Tier</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source} className="border-b border-border/60">
                  <td className="px-3 py-2 text-foreground">{s.source}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground-muted">{s.total}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">{s.full}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{s.snippet}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {s.ratePct == null ? <span className="text-foreground-subtle">—</span> : `${s.ratePct}%`}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide ${TIER_STYLE[s.tier]}`}>
                      {s.tier}
                    </span>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-foreground-muted">No enriched articles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-foreground-subtle mt-3">
        “Unmeasured” = enriched before the full-text flag existed; re-run the caption backfill to measure them.
      </p>
    </div>
  );
}
