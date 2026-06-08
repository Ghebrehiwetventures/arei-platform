import React, { useEffect, useState } from "react";
import { supabaseAuth } from "./supabase";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ClusterMember {
  articleId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  matchMethod: string | null;
  matchScore: number | null;
  isPrimary: boolean;
}
interface StoryCluster {
  id: string;
  cluster_title: string | null;
  country_code: string | null;
  topics: string[];
  entities: string[];
  status: string;
  source_count: number;
  latest_published_at: string | null;
  cluster_confidence: number | null;
  members: ClusterMember[];
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export function NewsClustersView() {
  const [clusters, setClusters] = useState<StoryCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyMulti, setOnlyMulti] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      const res = await fetch("/api/news-clusters", { credentials: "include", headers: await authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setClusters(data.clusters || []);
    })()
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [reload]);

  const shown = onlyMulti ? clusters.filter((c) => (c.source_count || 0) > 1) : clusters;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-foreground">News Clusters</h1>
      <p className="text-sm text-foreground-muted mb-4">
        Same-story articles grouped across sources (deduped feed). Read-only review — merge/split/publish lands next.
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs font-mono">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyMulti} onChange={(e) => setOnlyMulti(e.target.checked)} />
          Multi-source only
        </label>
        <button onClick={() => setReload((n) => n + 1)} className="px-2 py-1 rounded border border-border hover:bg-surface-2">
          ↻ Refresh
        </button>
        <span className="text-foreground-subtle">
          {shown.length} {onlyMulti ? "multi-source " : ""}clusters
        </span>
      </div>

      {loading && <div className="text-sm text-foreground-muted">Loading…</div>}
      {error && <div className="text-sm text-[#C44A3A]">Error: {error}</div>}

      <div className="space-y-3">
        {shown.map((c) => (
          <article key={c.id} className="rounded border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-700">
                  {c.source_count} {c.source_count === 1 ? "source" : "sources"}
                </span>
                {(c.topics || []).slice(0, 3).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide bg-surface-3 text-foreground-subtle">{t}</span>
                ))}
              </div>
              <span className="text-[11px] text-foreground-subtle">
                {c.country_code} · {fmtDate(c.latest_published_at)}
                {c.cluster_confidence != null ? ` · conf ${c.cluster_confidence}` : ""}
              </span>
            </div>
            <ul className="space-y-1">
              {c.members.map((m) => (
                <li
                  key={m.articleId}
                  className={`text-sm pl-3 border-l-2 ${m.isPrimary ? "border-accent" : "border-transparent"}`}
                  title={m.isPrimary ? "Lead source" : undefined}
                >
                  {m.sourceUrl ? (
                    <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">{m.title}</a>
                  ) : <span className="text-foreground">{m.title}</span>}
                  <span className={`text-[11px] ${m.isPrimary ? "text-accent" : "text-foreground-subtle"}`}>
                    {" · "}{m.sourceName}{m.isPrimary ? " · lead" : ""}{m.matchMethod && m.matchMethod !== "manual" ? ` · ${m.matchMethod}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!loading && !error && shown.length === 0 && (
          <div className="text-sm text-foreground-muted">
            No clusters yet. Run “⟳ Rebuild news clusters” in News Posts first.
          </div>
        )}
      </div>
    </div>
  );
}
