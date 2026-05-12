/* ══════════════════════════════════════════════════════════
   AREI ICON SYSTEM — 4 candidate marks
   Each is built on a 24×24 base grid for favicon scalability
   and a 64×64 ceremonial version. All hairlines snap to whole
   pixels at 24px so anti-aliasing stays crisp at app/favicon
   sizes. None resemble houses, palms, Africa silhouettes, or
   crypto marks — all are abstract data/registry glyphs.
   ══════════════════════════════════════════════════════════ */

/* Concept A — STACKED INDEX BARS
   Three horizontal bars of varying length suggesting registry
   rows / a tiny bar chart. The middle bar is filled solid as
   the "current index point". Read time-series + ledger. */
const IconStack = ({ size = 24, color = "currentColor", solid = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="2" style={{ display: "block" }}>
    <rect x="3" y="5"  width="14" height="2.5" fill={color} stroke="none" />
    <rect x="3" y="11" width="18" height="2.5" fill={solid ? color : "none"} stroke={color} strokeWidth="1.5" />
    <rect x="3" y="17" width="10" height="2.5" fill={color} stroke="none" />
  </svg>
);

/* Concept B — DATABASE CYLINDERS (minimal, premium)
   Two-tier cylinder rendered as ellipses + verticals only.
   Reduced to its absolute essential form: top ellipse, body
   verticals, mid hairline, bottom curve. Reads as "ledger" or
   "indexed records" without IT-support clip-art clichés. */
const IconCylinder = ({ size = 24, color = "currentColor", solid = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.6" strokeLinecap="square" style={{ display: "block" }}>
    <ellipse cx="12" cy="5" rx="7" ry="2.4" fill={solid ? color : "none"} />
    <line x1="5" y1="5"  x2="5" y2="19" />
    <line x1="19" y1="5" x2="19" y2="19" />
    <path d="M5 12 Q12 14.4 19 12" />
    <path d="M5 19 Q12 21.4 19 19" />
  </svg>
);

/* Concept C — GRID + INDEX POINT
   4×4 hairline grid with one filled cell — "the indexed
   coordinate". Reads structured-data, geographic, registry-as-
   matrix. Filled cell is bottom-row-third, deliberately not
   centred so it has direction. */
const IconGrid = ({ size = 24, color = "currentColor", solid = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.2" style={{ display: "block" }}>
    {/* outer frame */}
    <rect x="3" y="3" width="18" height="18" />
    {/* internal grid lines */}
    <line x1="7.5"  y1="3" x2="7.5"  y2="21" />
    <line x1="12"   y1="3" x2="12"   y2="21" />
    <line x1="16.5" y1="3" x2="16.5" y2="21" />
    <line x1="3" y1="7.5"  x2="21" y2="7.5"  />
    <line x1="3" y1="12"   x2="21" y2="12"   />
    <line x1="3" y1="16.5" x2="21" y2="16.5" />
    {/* the index point */}
    <rect x="12" y="12" width="4.5" height="4.5"
          fill={solid ? color : color} stroke="none" />
  </svg>
);

/* Concept D — LAYERED SQUARES (registry layers / records)
   Three offset hairline squares, suggesting stacked records or
   layered indices. Smallest at front is filled — "the active
   record". Refined isometric feel without literal isometric. */
const IconLayers = ({ size = 24, color = "currentColor", solid = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.4" strokeLinecap="square" style={{ display: "block" }}>
    <rect x="3"   y="3"   width="14" height="14" />
    <rect x="6.5" y="6.5" width="14" height="14" />
    <rect x="10"  y="10"  width="9"  height="9"
          fill={solid ? color : color} stroke="none" />
  </svg>
);

const ICON_REGISTRY = {
  stack:    { component: IconStack,    name: "STACK",    label: "Stacked index bars",    desc: "Registry rows. Reads time-series + ledger. The current index point is filled mid-bar." },
  cylinder: { component: IconCylinder, name: "CYL",      label: "Database cylinder",     desc: "Two-tier ledger cylinder, reduced to ellipse + verticals. Premium, institutional, infra." },
  grid:     { component: IconGrid,     name: "GRID",     label: "Grid + index point",    desc: "4×4 lattice with one filled cell. Reads coordinate / structured market data." },
  layers:   { component: IconLayers,   name: "LAYERS",   label: "Layered records",       desc: "Three stacked squares, frontmost filled. Reads records / index layers / registry depth." },
};

/* ICON GALLERY — the side-by-side concept board */
function IconGallery({ active, onPick }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1,
      background: "var(--kv-rule)",
      border: "1px solid var(--kv-rule)",
    }}>
      {Object.entries(ICON_REGISTRY).map(([key, def]) => {
        const Icon = def.component;
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onPick(key)}
            style={{
              background: isActive ? "var(--kv-green)" : "var(--kv-paper)",
              border: "none",
              padding: "32px 20px 24px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 18,
              textAlign: "left",
              transition: "background 0.15s",
              minHeight: 280,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{
                fontFamily: "var(--kv-mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: isActive ? "var(--kv-black)" : "var(--kv-gray-500)",
              }}>{String.fromCharCode(65 + Object.keys(ICON_REGISTRY).indexOf(key))} · {def.name}</span>
              {isActive && (
                <span style={{
                  fontFamily: "var(--kv-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "var(--kv-black)",
                  color: "var(--kv-green)",
                  padding: "3px 8px",
                }}>ACTIVE</span>
              )}
            </div>
            <div style={{
              border: "1px solid " + (isActive ? "rgba(0,0,0,0.4)" : "var(--kv-rule)"),
              padding: 28,
              background: isActive ? "rgba(255,255,255,0.5)" : "var(--kv-white)",
              alignSelf: "stretch",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Icon size={56} solid={true} />
            </div>
            <div>
              <div style={{
                fontFamily: "var(--kv-mono)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--kv-black)",
                marginBottom: 6,
              }}>{def.label}</div>
              <div style={{
                fontFamily: "var(--kv-mono)",
                fontSize: 11,
                lineHeight: 1.55,
                color: isActive ? "rgba(0,0,0,0.7)" : "var(--kv-gray-500)",
              }}>{def.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* SCALE BOARD — shows the active mark at favicon → display size */
function IconScaleBoard({ which }) {
  const Icon = ICON_REGISTRY[which].component;
  const sizes = [
    { px: 16, label: "favicon" },
    { px: 24, label: "ui" },
    { px: 32, label: "nav" },
    { px: 48, label: "card" },
    { px: 80, label: "hero" },
    { px: 128, label: "ceremonial" },
  ];
  return (
    <div style={{
      border: "1px solid var(--kv-rule)",
      background: "var(--kv-paper)",
      padding: "40px 32px",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 24,
      flexWrap: "wrap",
    }}>
      {sizes.map(s => (
        <div key={s.px} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <Icon size={s.px} solid={true} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span className="t-num" style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-black)", fontWeight: 500 }}>{s.px}px</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--kv-gray-500)" }}>{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* CONTRAST BOARD — mark on every brand surface */
function IconContrastBoard({ which }) {
  const Icon = ICON_REGISTRY[which].component;
  const surfaces = [
    { bg: "var(--kv-paper)",    fg: "var(--kv-black)",     border: "var(--kv-rule)",  label: "PAPER",   sub: "#ffffff" },
    { bg: "var(--kv-off-white)",fg: "var(--kv-black)",     border: "var(--kv-rule)",  label: "OFF-WHITE", sub: "#f2f0ec" },
    { bg: "var(--kv-green)",    fg: "var(--kv-black)",     border: "var(--kv-black)", label: "BRAND",   sub: "#8ecfbf" },
    { bg: "var(--kv-green-deep)",fg: "var(--kv-green)",    border: "transparent",     label: "DEEP",    sub: "#2d4a42" },
    { bg: "var(--kv-black)",    fg: "var(--kv-green)",     border: "transparent",     label: "INK",     sub: "#0a0a0a" },
    { bg: "var(--kv-black)",    fg: "var(--kv-white)",     border: "transparent",     label: "INK · MONO", sub: "#0a0a0a" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, background: "var(--kv-rule)", border: "1px solid var(--kv-rule)" }}>
      {surfaces.map(s => (
        <div key={s.label} style={{
          background: s.bg,
          padding: "32px 16px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          border: s.border !== "transparent" ? `0 solid ${s.border}` : "none",
        }}>
          <Icon size={48} color={s.fg} solid={true} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: s.fg, opacity: 0.9 }}>{s.label}</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: s.fg, opacity: 0.5, marginTop: 3 }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  IconStack, IconCylinder, IconGrid, IconLayers,
  ICON_REGISTRY, IconGallery, IconScaleBoard, IconContrastBoard,
});
