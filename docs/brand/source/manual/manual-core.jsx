/* ══════════════════════════════════════════════════════════
   AREI BRAND GUIDELINES · CORE PRIMITIVES
   Mark, lockups, markets, shared building blocks.
   Self-contained — does not depend on bg/.
   ══════════════════════════════════════════════════════════ */

/* ───────── D · LAYERS — the master mark ───────────────── */
const Mark = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.4" strokeLinecap="square"
       style={{ display: "block" }}>
    <rect x="3"   y="3"   width="14" height="14" />
    <rect x="6.5" y="6.5" width="14" height="14" />
    <rect x="10"  y="10"  width="9"  height="9" fill={color} stroke="none" />
  </svg>
);

/* ───────── MARKETS ──────────────────────────────────────── */
const MARKETS = [
  { code: "AREI", country: "AREI",       short: "AREI",  ticker: "AREI",  master: true },
  { code: "AF",   country: "AFRICA",     short: "AFREI", ticker: "AFREI" },
  { code: "CV",   country: "CAPE VERDE", short: "CVREI", ticker: "CVREI" },
  { code: "NG",   country: "NIGERIA",    short: "NGREI", ticker: "NGREI" },
  { code: "KE",   country: "KENYA",      short: "KEREI", ticker: "KEREI" },
  { code: "GH",   country: "GHANA",      short: "GHREI", ticker: "GHREI" },
  { code: "MA",   country: "MOROCCO",    short: "MAREI", ticker: "MAREI" },
];

/* ───────── PRIMARY LOCKUP — three-line ceremonial ─────── */
function PrimaryLockup({ m, h = 64, fg = "var(--kv-black)" }) {
  const tag = m.master ? "AREI" : m.country;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", gap: h * 0.36, color: fg }}>
      <Mark size={h} color={fg} />
      <span style={{
        display: "flex", flexDirection: "column",
        gap: h * 0.06, lineHeight: 1.0,
        fontFamily: "var(--kv-mono)", color: fg,
        paddingTop: h * 0.04,
      }}>
        <span style={{
          fontSize: h * 0.34, fontWeight: 600,
          letterSpacing: "0.04em", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>{tag}</span>
        {!m.master && <>
          <span style={{
            fontSize: h * 0.34, fontWeight: 400,
            letterSpacing: "0.04em", textTransform: "uppercase",
            opacity: 0.85, whiteSpace: "nowrap",
          }}>REAL ESTATE</span>
          <span style={{
            fontSize: h * 0.34, fontWeight: 400,
            letterSpacing: "0.04em", textTransform: "uppercase",
            opacity: 0.85, whiteSpace: "nowrap",
          }}>INDEX</span>
        </>}
      </span>
    </span>
  );
}

/* ───────── COMPACT LOCKUP — single-line product ──────── */
function CompactLockup({ m, fg = "var(--kv-black)", size = 13 }) {
  const tag = m.master ? "AREI" : m.country;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: size * 0.7, color: fg,
      whiteSpace: "nowrap", flexShrink: 0, flexWrap: "nowrap",
    }}>
      <Mark size={size * 1.7} color={fg} />
      <span style={{
        fontFamily: "var(--kv-mono)", fontSize: size, fontWeight: 600,
        letterSpacing: "0.12em", lineHeight: 1, textTransform: "uppercase", color: fg,
        whiteSpace: "nowrap",
      }}>
        {m.master ? "AREI" : (
          <>
            {tag} <span style={{ fontWeight: 400, opacity: 0.7 }}>REAL ESTATE INDEX</span>
          </>
        )}
      </span>
    </span>
  );
}

/* ───────── MOBILE APP BAR LOCKUP — mark + COUNTRY only ── */
/* Stricter mobile rule: the app bar carries country only; the
   "REAL ESTATE INDEX" descriptor lives in page context, hero,
   or section identity below. Never crammed into a phone header. */
function MobileAppBarLockup({ m, fg = "var(--kv-black)", size = 11 }) {
  const tag = m.master ? "AREI" : m.country;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: size * 0.65, color: fg,
      whiteSpace: "nowrap", flexShrink: 0, flexWrap: "nowrap",
    }}>
      <Mark size={size * 1.55} color={fg} />
      <span style={{
        fontFamily: "var(--kv-mono)", fontSize: size, fontWeight: 600,
        letterSpacing: "0.12em", lineHeight: 1, textTransform: "uppercase", color: fg,
        whiteSpace: "nowrap",
      }}>{tag}</span>
    </span>
  );
}

/* ───────── SECTION SHELL ────────────────────────────── */
function SectionHead({ num, title, lede }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-num">{num}</div>
        <h2 className="section-title">{title}</h2>
      </div>
      {lede && <div className="section-lede">{lede}</div>}
    </div>
  );
}

function Subhead({ kicker, children }) {
  return (
    <div className="subhead">
      {kicker && <span className="subhead-kicker">{kicker}</span>}
      <span>{children}</span>
    </div>
  );
}

/* ───────── PLATE — captioned design specimen frame ───── */
function Plate({ title, sub, tag, bg = "var(--kv-paper)", pad = 32, minH = 220, children, full }) {
  return (
    <div className="plate">
      <div className="plate-canvas" style={{ background: bg, padding: full ? 0 : pad, minHeight: minH }}>
        {children}
      </div>
      {(title || tag) && (
        <div className="plate-foot">
          <div>
            {title && <div className="plate-title">{title}</div>}
            {sub && <div className="plate-sub">{sub}</div>}
          </div>
          {tag && <span className="plate-tag">{tag}</span>}
        </div>
      )}
    </div>
  );
}

/* ───────── DO / DON'T STAMP ──────────────────────────── */
function StatusStamp({ kind = "do", children }) {
  const isDo = kind === "do";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: isDo ? "var(--kv-green-deep)" : "var(--kv-warn)",
    }}>
      <span style={{
        width: 10, height: 10, display: "inline-block",
        background: isDo ? "var(--kv-green-deep)" : "var(--kv-warn)",
      }} />
      {children || (isDo ? "DO" : "DON'T")}
    </span>
  );
}

Object.assign(window, {
  Mark, MARKETS, PrimaryLockup, CompactLockup, MobileAppBarLockup,
  SectionHead, Subhead, Plate, StatusStamp,
});
