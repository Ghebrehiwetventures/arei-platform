/* ══════════════════════════════════════════════════════════
   DATA VIZ — index time-series, sparkline, coverage map
   ══════════════════════════════════════════════════════════ */

/* AREI / CVREI Index time-series chart.
   Hairline axes, mono labels, tabular-nums, no grid clutter.
   100 = baseline (Jan 2024). Last marker is filled. */
function IndexChart({ height = 280 }) {
  // 24 monthly points, indexed
  const data = [100, 99.6, 100.3, 101.1, 102.4, 103.2, 103.8, 104.6, 105.1, 105.4, 106.2, 107.0, 107.4, 108.3, 109.1, 109.8, 110.4, 111.3, 112.1, 113.0, 113.4, 114.2, 115.1, 116.4];
  const months = ["JAN'24","","MAR","","MAY","","JUL","","SEP","","NOV","","JAN'25","","MAR","","MAY","","JUL","","SEP","","NOV","DEC"];
  const w = 720, h = height, padL = 56, padR = 24, padT = 20, padB = 36;
  const min = 98, max = 118;
  const x = i => padL + (i / (data.length - 1)) * (w - padL - padR);
  const y = v => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const path = data.map((d,i) => `${i===0?"M":"L"}${x(i)},${y(d)}`).join(" ");
  // Filled area
  const fillPath = path + ` L${x(data.length-1)},${h-padB} L${x(0)},${h-padB} Z`;
  const last = data[data.length - 1];
  const baseline = data[0];

  const gridY = [100, 105, 110, 115];

  return (
    <div className="bg-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="t-eyebrow"><b>CVREI</b></span>
          <div style={{ marginTop: 6, fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)" }}>
            Cape Verde Real Estate Index · monthly · base = Jan 2024
          </div>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
          <div>
            <div className="t-label">Latest</div>
            <div className="t-num" style={{ fontSize: 24, fontWeight: 500 }}>{last.toFixed(1)}</div>
          </div>
          <div>
            <div className="t-label">24m Δ</div>
            <div className="t-num" style={{ fontSize: 14, color: "var(--kv-green-deep)" }}>+{(last - baseline).toFixed(1)} pts · +{((last/baseline-1)*100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }} preserveAspectRatio="none">
        {/* Y-grid hairlines + labels */}
        {gridY.map(g => (
          <g key={g}>
            <line x1={padL} x2={w-padR} y1={y(g)} y2={y(g)} stroke="var(--kv-rule-soft)" strokeWidth="1" />
            <text x={padL - 10} y={y(g) + 3} textAnchor="end"
                  style={{ fontFamily: "var(--kv-mono)", fontSize: 10, fill: "var(--kv-gray-500)", letterSpacing: "0.06em" }}>{g}</text>
          </g>
        ))}
        {/* Baseline emphasis at 100 */}
        <line x1={padL} x2={w-padR} y1={y(100)} y2={y(100)} stroke="var(--kv-rule)" strokeWidth="1" strokeDasharray="2 4" />

        {/* Filled area, very pale brand tint */}
        <path d={fillPath} fill="var(--kv-green-tint)" />
        {/* Line */}
        <path d={path} fill="none" stroke="var(--kv-black)" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Last marker */}
        <circle cx={x(data.length-1)} cy={y(last)} r="4" fill="var(--kv-black)" />
        <circle cx={x(data.length-1)} cy={y(last)} r="9" fill="none" stroke="var(--kv-black)" strokeWidth="1" opacity="0.3" />

        {/* X labels */}
        {months.map((m, i) => m && (
          <text key={i} x={x(i)} y={h - 14} textAnchor="middle"
                style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fill: "var(--kv-gray-500)", letterSpacing: "0.1em" }}>{m}</text>
        ))}
      </svg>
    </div>
  );
}

/* Inline sparkline for table rows / cards */
function Sparkline({ data, w = 80, h = 22, positive = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const x = i => (i / (data.length - 1)) * w;
  const y = v => h - ((v - min) / range) * (h - 2) - 1;
  const path = data.map((d,i) => `${i===0?"M":"L"}${x(i)},${y(d)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <path d={path} fill="none" stroke={positive ? "var(--kv-green-deep)" : "var(--kv-accent-coral)"} strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={x(data.length-1)} cy={y(data[data.length-1])} r="1.8" fill={positive ? "var(--kv-green-deep)" : "var(--kv-accent-coral)"} />
    </svg>
  );
}

/* Coverage status — countries in 3 phases. Abstract grid, NOT
   a Africa silhouette. Each market is a labelled cell in a
   continental grid, status by fill weight. */
function CoverageGrid() {
  const markets = [
    { code: "CV", name: "Cape Verde",   status: "live",     phase: "kazaverde · cvrei" },
    { code: "NG", name: "Nigeria",      status: "pipeline", phase: "Q2 2026" },
    { code: "KE", name: "Kenya",        status: "pipeline", phase: "Q2 2026" },
    { code: "ZA", name: "South Africa", status: "planned",  phase: "Q4 2026" },
    { code: "GH", name: "Ghana",        status: "planned",  phase: "Q4 2026" },
    { code: "MA", name: "Morocco",      status: "planned",  phase: "2027" },
    { code: "TZ", name: "Tanzania",     status: "planned",  phase: "2027" },
    { code: "ET", name: "Ethiopia",     status: "future",   phase: "TBD" },
    { code: "EG", name: "Egypt",        status: "future",   phase: "TBD" },
    { code: "SN", name: "Senegal",      status: "future",   phase: "TBD" },
    { code: "RW", name: "Rwanda",       status: "future",   phase: "TBD" },
    { code: "CI", name: "Côte d'Ivoire",status: "future",   phase: "TBD" },
  ];
  const styleFor = (s) => {
    if (s === "live")     return { bg: "var(--kv-green)", fg: "var(--kv-black)", border: "var(--kv-black)" };
    if (s === "pipeline") return { bg: "var(--kv-paper)", fg: "var(--kv-black)", border: "var(--kv-black)" };
    if (s === "planned")  return { bg: "var(--kv-paper)", fg: "var(--kv-ink-700)", border: "var(--kv-rule)" };
    return                       { bg: "var(--kv-off-white)", fg: "var(--kv-gray-500)", border: "var(--kv-rule)" };
  };
  return (
    <div className="bg-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="t-eyebrow"><b>Coverage</b></span>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", marginTop: 6 }}>
            12 markets · 1 live · 2 pipeline · 4 planned · 5 future
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { label: "LIVE",     ...styleFor("live") },
            { label: "PIPELINE", ...styleFor("pipeline") },
            { label: "PLANNED",  ...styleFor("planned") },
            { label: "FUTURE",   ...styleFor("future") },
          ].map(l => (
            <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--kv-gray-500)" }}>
              <span style={{ width: 10, height: 10, background: l.bg, border: `1px solid ${l.border}` }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--kv-rule)", border: "1px solid var(--kv-rule)" }}>
        {markets.map(m => {
          const s = styleFor(m.status);
          return (
            <div key={m.code} style={{ background: s.bg, padding: "16px 14px 14px", borderTop: `2px solid ${s.border}`, marginTop: -1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 14, fontWeight: 600, color: s.fg }}>{m.code}</span>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: s.fg, opacity: 0.6 }}>{m.status}</span>
              </div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: s.fg, marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: s.fg, opacity: 0.55 }}>{m.phase}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { IndexChart, Sparkline, CoverageGrid });
