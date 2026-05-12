/* ══════════════════════════════════════════════════════════
   SYSTEM FOUNDATIONS — color / type / spacing / motion / sound
   Codified from kazaverde-web/src/styles/globals.css.
   These are the canonical token displays used across the guide.
   ══════════════════════════════════════════════════════════ */

const COLOR_INK = [
  { token: "--kv-black",     hex: "#0a0a0a", label: "Ink — primary" },
  { token: "--kv-ink-700",   hex: "rgba(0,0,0,0.78)", label: "Ink 700 — body strong" },
  { token: "--kv-ink-600",   hex: "rgba(0,0,0,0.62)", label: "Ink 600 — body" },
  { token: "--kv-gray-500",  hex: "#888888", label: "Gray 500 — meta" },
  { token: "--kv-ink-400",   hex: "rgba(0,0,0,0.45)", label: "Ink 400 — quiet" },
  { token: "--kv-ink-300",   hex: "rgba(0,0,0,0.30)", label: "Ink 300 — disabled" },
];
const COLOR_SURFACE = [
  { token: "--kv-white",     hex: "#fafafa", label: "Page" },
  { token: "--kv-paper",     hex: "#ffffff", label: "Surface" },
  { token: "--kv-off-white", hex: "#f2f0ec", label: "Warm tint" },
  { token: "--kv-hover",     hex: "#ececea", label: "Hover fill" },
];
const COLOR_BRAND = [
  { token: "--kv-green",       hex: "#8ecfbf", label: "Brand · accent" },
  { token: "--kv-green-soft",  hex: "#b6dfd2", label: "Brand · soft" },
  { token: "--kv-green-hover", hex: "#7ec0b0", label: "Brand · hover" },
  { token: "--kv-green-deep",  hex: "#2d4a42", label: "Brand · deep ink" },
  { token: "--kv-green-tint",  hex: "rgba(142,207,191,0.18)", label: "Brand · tint" },
];
const COLOR_DATA = [
  { token: "--kv-green-deep",      hex: "#2d4a42", label: "Series 1 · positive" },
  { token: "--kv-accent-ocean",    hex: "#8eb4cf", label: "Series 2 · neutral" },
  { token: "--kv-accent-lavender", hex: "#b48ecf", label: "Series 3 · qualitative" },
  { token: "--kv-accent-amber",    hex: "#cfb48e", label: "Series 4 · pending" },
  { token: "--kv-accent-coral",    hex: "#cf8e8e", label: "Series 5 · alert" },
  { token: "--kv-gray-500",        hex: "#888888", label: "Series 6 · neutral" },
];

/* Type specimen rows — codified scale */
function TypeSpecimen() {
  return (
    <div className="bg-card" style={{ padding: "8px 28px" }}>
      <TypeRow label={{ name: "Hero", spec: "mono · 56/clamp · -0.02em · regular" }}
               sample="Cape Verde Real Estate Index"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05, color: "var(--kv-black)" }} />
      <TypeRow label={{ name: "H1", spec: "mono · 40 · -0.02em · regular" }}
               sample="A market needs a memory."
               style={{ fontFamily: "var(--kv-mono)", fontSize: 40, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.12 }} />
      <TypeRow label={{ name: "H2", spec: "mono · 28 · -0.02em · regular" }}
               sample="Verified listings, indexed monthly"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.18 }} />
      <TypeRow label={{ name: "H3", spec: "mono · 22 · -0.02em · medium" }}
               sample="How CVREI is calculated"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.25 }} />
      <TypeRow label={{ name: "Body — mono", spec: "mono · 13 · 1.55" }}
               sample="Mono is the surface vocabulary: UI, labels, prices, all data. It signals precision and treats every number as a citation."
               style={{ fontFamily: "var(--kv-mono)", fontSize: 13, lineHeight: 1.55, color: "var(--kv-ink-700)" }} />
      <TypeRow label={{ name: "Body — sans (kv-prose)", spec: "sans · 15 · 1.75" }}
               sample="Sans is reserved for editorial long-form — articles, briefings, essays. Anything more than two paragraphs of mono reads cold; sans is the convention for read-density."
               style={{ fontFamily: "var(--kv-sans)", fontSize: 15, lineHeight: 1.75, color: "var(--kv-ink-700)" }} />
      <TypeRow label={{ name: "Eyebrow", spec: "mono · 11 · 0.16em · semibold · UPPER" }}
               sample="// MARKET PULSE"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--kv-gray-500)" }} />
      <TypeRow label={{ name: "Label", spec: "mono · 10 · 0.16em · semibold · UPPER" }}
               sample="STATUS · VERIFIED"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--kv-gray-500)" }} />
      <TypeRow label={{ name: "Numeral", spec: "mono · tabular · -0.02em" }}
               sample="€2,180/m² · 116.4 · +3.4%"
               style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }} />
      <TypeRow label={{ name: "Disclaimer", spec: "mono · 11 · 0.04em · 1.6" }}
               sample="Methodology v0.3 · n=412 · prior 30d. Past performance does not predict future returns."
               style={{ fontFamily: "var(--kv-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--kv-gray-500)", lineHeight: 1.6 }} />
    </div>
  );
}

/* Spacing scale ladder */
function SpacingLadder() {
  const tokens = [
    { name: "--kv-s-1", px: 4 },
    { name: "--kv-s-2", px: 8 },
    { name: "--kv-s-3", px: 12 },
    { name: "--kv-s-4", px: 16 },
    { name: "--kv-s-5", px: 20 },
    { name: "--kv-s-6", px: 24 },
    { name: "--kv-s-7", px: 32 },
    { name: "--kv-s-8", px: 40 },
    { name: "--kv-s-10", px: 56 },
    { name: "--kv-s-12", px: 72 },
  ];
  return (
    <div className="bg-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tokens.map(t => (
          <div key={t.name} style={{ display: "grid", gridTemplateColumns: "120px 60px 1fr", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)" }}>{t.name}</span>
            <span className="t-num" style={{ fontFamily: "var(--kv-mono)", fontSize: 12, fontWeight: 500, textAlign: "right" }}>{t.px}px</span>
            <span style={{ height: 8, background: "var(--kv-black)", width: t.px * 4 }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", lineHeight: 1.6 }}>
        4px base. Section padding: <b style={{ color: "var(--kv-black)" }}>--kv-s-12</b>. Card padding: <b style={{ color: "var(--kv-black)" }}>--kv-s-6</b>. Inter-element gaps: <b style={{ color: "var(--kv-black)" }}>--kv-s-3</b> / <b style={{ color: "var(--kv-black)" }}>--kv-s-4</b>. Never half-step.
      </div>
    </div>
  );
}

/* Motion/rule reference card */
function PrimitiveCard({ title, items }) {
  return (
    <div className="bg-card" style={{ padding: 24 }}>
      <span className="t-eyebrow"><b>{title}</b></span>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map(it => (
          <div key={it.name} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start", paddingBottom: 12, borderBottom: "1px solid var(--kv-rule-soft)" }}>
            <div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 12, color: "var(--kv-black)", fontWeight: 500 }}>{it.name}</div>
              {it.desc && <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", marginTop: 4, lineHeight: 1.55 }}>{it.desc}</div>}
            </div>
            <div className="t-num" style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-ink-700)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { COLOR_INK, COLOR_SURFACE, COLOR_BRAND, COLOR_DATA, TypeSpecimen, SpacingLadder, PrimitiveCard });
