/* ══════════════════════════════════════════════════════════
   LOGO SYSTEM
   Primary lockup pattern: [icon] [wordmark]
     - AREI primary:        icon + AREI
     - Market lockup:       icon + KazaVerde
     - Formal lockup:       icon + Cape Verde Real Estate Index
     - Powered-by:          KazaVerde — powered by [icon] AREI
   All wordmarks are IBM Plex Mono. AREI is set in caps with
   tight tracking; KazaVerde sets lowercase for a softer
   consumer surface.
   ══════════════════════════════════════════════════════════ */

const LOCKUP_HEIGHTS = { sm: 18, md: 24, lg: 36, xl: 56 };

function Lockup({ which, variant, size = "md", color, on = "paper" }) {
  const Icon = ICON_REGISTRY[which].component;
  const h = LOCKUP_HEIGHTS[size];
  // Color resolution against surface
  const fg =
    color ?? (on === "ink" ? "var(--kv-white)"
            : on === "deep" ? "var(--kv-green)"
            : on === "brand" ? "var(--kv-black)"
            : "var(--kv-black)");

  // ── Primary AREI: icon + "AREI" caps ─────────────────────
  if (variant === "primary") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: h * 0.4, color: fg }}>
        <Icon size={h} solid={true} />
        <span style={{
          fontFamily: "var(--kv-mono)",
          fontSize: h * 0.78,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: fg,
          lineHeight: 1,
          textTransform: "uppercase",
        }}>AREI</span>
      </span>
    );
  }

  // ── Market lockup: icon + KazaVerde ──────────────────────
  if (variant === "market") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: h * 0.4, color: fg }}>
        <Icon size={h} solid={true} />
        <span style={{
          fontFamily: "var(--kv-mono)",
          fontSize: h * 0.6,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: fg,
          lineHeight: 1,
        }}>kazaverde</span>
      </span>
    );
  }

  // ── Formal market lockup ──────────────────────────────────
  if (variant === "formal") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: h * 0.4, color: fg }}>
        <Icon size={h} solid={true} />
        <span style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          lineHeight: 1.05,
        }}>
          <span style={{
            fontFamily: "var(--kv-mono)",
            fontSize: h * 0.36,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: fg,
            opacity: 0.7,
          }}>CVREI</span>
          <span style={{
            fontFamily: "var(--kv-mono)",
            fontSize: h * 0.42,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: fg,
          }}>Cape Verde Real Estate Index</span>
        </span>
      </span>
    );
  }

  // ── Stacked / vertical (for square contexts: app icon, profile) ──
  if (variant === "stacked") {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: h * 0.32, color: fg }}>
        <Icon size={h * 1.4} solid={true} />
        <span style={{
          fontFamily: "var(--kv-mono)",
          fontSize: h * 0.5,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: fg,
          lineHeight: 1,
        }}>AREI</span>
      </span>
    );
  }

  // ── Powered-by lockup: kazaverde / powered by · AREI ────
  if (variant === "powered") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: h * 0.4, color: fg }}>
        <span style={{
          fontFamily: "var(--kv-mono)",
          fontSize: h * 0.6,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: fg,
        }}>kazaverde</span>
        <span style={{
          width: 1,
          height: h * 0.9,
          background: fg,
          opacity: 0.25,
        }} />
        <span style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: 2,
          lineHeight: 1,
        }}>
          <span style={{
            fontFamily: "var(--kv-mono)",
            fontSize: h * 0.28,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: fg,
            opacity: 0.5,
          }}>powered by</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: h * 0.2, marginTop: 2 }}>
            <Icon size={h * 0.6} solid={true} />
            <span style={{
              fontFamily: "var(--kv-mono)",
              fontSize: h * 0.48,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: fg,
              lineHeight: 1,
            }}>AREI</span>
          </span>
        </span>
      </span>
    );
  }

  // ── Icon-only ────────────────────────────────────────────
  return <Icon size={h * 1.2} color={fg} solid={true} />;
}

/* LockupPlate — labelled card showing one lockup variant */
function LockupPlate({ title, sub, which, variant, size = "lg", on = "paper" }) {
  const surfaceStyles = {
    paper: { background: "var(--kv-paper)" },
    off:   { background: "var(--kv-off-white)" },
    brand: { background: "var(--kv-green)" },
    deep:  { background: "var(--kv-green-deep)" },
    ink:   { background: "var(--kv-black)" },
  };
  const labelColor = on === "ink" || on === "deep" ? "rgba(255,255,255,0.5)" : "var(--kv-gray-500)";
  return (
    <div style={{ border: "1px solid var(--kv-rule)" }}>
      <div style={{
        ...surfaceStyles[on],
        padding: "56px 40px",
        minHeight: 180,
        display: "flex",
        alignItems: "center",
      }}>
        <Lockup which={which} variant={variant} size={size} on={on} />
      </div>
      <div style={{
        borderTop: "1px solid var(--kv-rule)",
        padding: "12px 16px",
        background: "var(--kv-paper)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 600, color: "var(--kv-black)" }}>{title}</div>
          {sub && <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: labelColor }}>
          on {on}
        </span>
      </div>
    </div>
  );
}

/* CLEAR SPACE diagram */
function ClearSpaceDiagram({ which }) {
  const Icon = ICON_REGISTRY[which].component;
  const cap = 24; // x-height proxy = icon size
  const pad = cap; // 1× icon clear space all sides
  return (
    <div style={{ background: "var(--kv-off-white)", padding: 40, border: "1px solid var(--kv-rule)" }}>
      <div style={{
        display: "inline-flex",
        position: "relative",
        background: "var(--kv-paper)",
        border: "1px dashed var(--kv-rule-strong)",
        padding: pad,
      }}>
        {/* Clear space overlays */}
        {["top", "right", "bottom", "left"].map(side => (
          <div key={side} style={{
            position: "absolute",
            ...(side === "top"    ? { top: 0,    left: 0, right: 0, height: pad } : {}),
            ...(side === "bottom" ? { bottom: 0, left: 0, right: 0, height: pad } : {}),
            ...(side === "left"   ? { left: 0,   top: 0, bottom: 0, width: pad } : {}),
            ...(side === "right"  ? { right: 0,  top: 0, bottom: 0, width: pad } : {}),
            background: "var(--kv-green-tint)",
            pointerEvents: "none",
          }} />
        ))}
        <div style={{ position: "relative", display: "inline-flex" }}>
          <Lockup which={which} variant="primary" size="md" />
        </div>
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>cap unit</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 500, marginTop: 4 }}>1× icon height</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>min margin</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 500, marginTop: 4 }}>= cap, all sides</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>min lockup width</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 500, marginTop: 4 }}>96px digital · 24mm print</div>
        </div>
      </div>
    </div>
  );
}

/* DO / DON'T grid */
function DoDontGrid({ which }) {
  const Icon = ICON_REGISTRY[which].component;
  const cell = (good, label, content) => (
    <div style={{
      border: "1px solid var(--kv-rule)",
      background: "var(--kv-paper)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        flex: 1,
        minHeight: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--kv-off-white)",
        position: "relative",
      }}>
        {content}
        <span style={{
          position: "absolute",
          top: 10, left: 10,
          fontFamily: "var(--kv-mono)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: good ? "var(--kv-green-deep)" : "var(--kv-accent-coral)",
          background: "var(--kv-paper)",
          border: `1px solid ${good ? "var(--kv-green-deep)" : "var(--kv-accent-coral)"}`,
          padding: "2px 7px",
        }}>{good ? "DO" : "DON'T"}</span>
      </div>
      <div style={{ borderTop: "1px solid var(--kv-rule)", padding: "10px 14px", fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-ink-700)" }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {cell(true,  "Use icon + wordmark together at default proportions",
        <Lockup which={which} variant="primary" size="md" />
      )}
      {cell(false, "Don't stretch the icon away from the wordmark",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 56 }}>
          <Icon size={24} solid={true} />
          <span style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 600, letterSpacing: "0.12em" }}>AREI</span>
        </span>
      )}
      {cell(false, "Don't recolor the wordmark in non-system colors",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Icon size={24} color="#e44" solid={true} />
          <span style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 600, letterSpacing: "0.12em", color: "#e44" }}>AREI</span>
        </span>
      )}
      {cell(false, "Don't substitute the type — only IBM Plex Mono",
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Icon size={24} solid={true} />
          <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.04em" }}>AREI</span>
        </span>
      )}
    </div>
  );
}

Object.assign(window, { Lockup, LockupPlate, ClearSpaceDiagram, DoDontGrid });
