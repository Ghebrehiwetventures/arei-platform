/* ══════════════════════════════════════════════════════════
   COMPONENT LIBRARY — buttons, cards, listing card, tables,
   status pills, KPI strip, eyebrows. Codified from real
   product CSS (kazaverde-web/src/styles/globals.css and
   PropertyCard / Listings / Landing pages).
   ══════════════════════════════════════════════════════════ */

/* --- Color swatch --- */
function Swatch({ token, hex, label, on }) {
  const dark = on === "ink";
  return (
    <div style={{ border: "1px solid var(--kv-rule)", background: "var(--kv-paper)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: hex, height: 100, borderBottom: "1px solid var(--kv-rule)" }} />
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 600 }}>{label}</div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", marginTop: 2 }}>{token}</div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", marginTop: 2 }}>{hex}</div>
      </div>
    </div>
  );
}

function ColorScale({ title, swatches }) {
  return (
    <div>
      <div className="t-label" style={{ marginBottom: 12, display: "block" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {swatches.map(s => <Swatch key={s.token} {...s} />)}
      </div>
    </div>
  );
}

/* --- Type specimen row --- */
function TypeRow({ label, sample, style }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, padding: "20px 0", borderBottom: "1px solid var(--kv-rule-soft)", alignItems: "baseline" }}>
      <div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 600 }}>{label.name}</div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", marginTop: 2 }}>{label.spec}</div>
      </div>
      <div style={style}>{sample}</div>
    </div>
  );
}

/* --- Listing card (codified from PropertyCard.tsx) --- */
function ListingCard({ price, location, type, beds, baths, m2, status = "verified", img }) {
  return (
    <div className="bg-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{
        height: 168,
        background: img ? `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35) 100%), url(${img}) center/cover` : "linear-gradient(135deg, #d4d2cc 0%, #b8bab0 100%)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
          <span className="bg-pill bg-pill--green">{type}</span>
        </div>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <span className="bg-pill bg-pill--strong" style={{ background: "rgba(255,255,255,0.95)" }}>
            <span style={{
              display: "inline-block", width: 6, height: 6,
              background: status === "verified" ? "var(--kv-green-deep)" : "var(--kv-accent-amber)",
              marginRight: 6, verticalAlign: "middle",
            }} />
            {status.toUpperCase()}
          </span>
        </div>
      </div>
      <div style={{ padding: "16px 18px 18px" }}>
        <div className="t-num" style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 500, marginBottom: 4 }}>€{price.toLocaleString()}</div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-ink-700)", marginBottom: 12 }}>{location}</div>
        <div style={{ display: "flex", gap: 14, fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", letterSpacing: "0.04em", paddingTop: 10, borderTop: "1px solid var(--kv-rule-soft)" }}>
          <span>{m2} m²</span>
          {beds != null && <span>· {beds} bd</span>}
          {baths != null && <span>· {baths} ba</span>}
        </div>
      </div>
    </div>
  );
}

/* --- KPI strip cell --- */
function KPICell({ label, value, delta, deltaPositive = true, last }) {
  return (
    <div style={{
      padding: "26px 22px",
      borderRight: last ? "none" : "1px solid var(--kv-rule)",
    }}>
      <div className="t-label" style={{ marginBottom: 10 }}>{label}</div>
      <div className="t-num" style={{ fontFamily: "var(--kv-mono)", fontSize: 28, fontWeight: 400, lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {delta && (
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em", color: deltaPositive ? "var(--kv-green-deep)" : "var(--kv-accent-coral)" }}>
          {delta}
        </div>
      )}
    </div>
  );
}

function KPIStrip({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, border: "1px solid var(--kv-rule)", background: "var(--kv-paper)" }}>
      {items.map((it, i) => <KPICell key={it.label} {...it} last={i === items.length - 1} />)}
    </div>
  );
}

/* --- Status pill set --- */
function StatusSet() {
  const items = [
    { label: "VERIFIED",  dot: "var(--kv-green-deep)", border: "var(--kv-black)" },
    { label: "PENDING",   dot: "var(--kv-accent-amber)", border: "var(--kv-black)" },
    { label: "INDEXED",   dot: "var(--kv-accent-ocean)", border: "var(--kv-black)" },
    { label: "OFF-MARKET",dot: "var(--kv-gray-500)", border: "var(--kv-rule)" },
    { label: "FLAGGED",   dot: "var(--kv-accent-coral)", border: "var(--kv-accent-coral)" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map(i => (
        <span key={i.label} className="bg-pill" style={{ borderColor: i.border, display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, background: i.dot }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* --- Mini data table --- */
function DataTable() {
  const rows = [
    { id: "CV-PRA-0184", loc: "Praia, Santiago",   type: "Residential", price: 185000, m2: 95,  delta: "+2.1%", status: "VERIFIED" },
    { id: "CV-SAL-0211", loc: "Santa Maria, Sal",  type: "Residential", price: 240000, m2: 110, delta: "+0.8%", status: "VERIFIED" },
    { id: "CV-BOA-0042", loc: "Sal Rei, Boa Vista",type: "Land",        price:  95000, m2: 600, delta: "—",     status: "PENDING"  },
    { id: "CV-MIN-0117", loc: "Mindelo, São Vicente", type: "Commercial", price: 420000, m2: 220, delta: "+3.4%", status: "VERIFIED" },
  ];
  return (
    <div style={{ border: "1px solid var(--kv-rule)", background: "var(--kv-paper)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--kv-mono)", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--kv-rule)" }}>
            {["ID", "Location", "Type", "Price", "m²", "30d Δ", "Status"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "12px 14px",
                fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
                fontWeight: 600, color: "var(--kv-gray-500)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--kv-rule-soft)" }}>
              <td style={{ padding: "13px 14px", color: "var(--kv-gray-500)" }}>{r.id}</td>
              <td style={{ padding: "13px 14px", color: "var(--kv-black)" }}>{r.loc}</td>
              <td style={{ padding: "13px 14px", color: "var(--kv-ink-700)" }}>{r.type}</td>
              <td style={{ padding: "13px 14px", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>€{r.price.toLocaleString()}</td>
              <td style={{ padding: "13px 14px", fontVariantNumeric: "tabular-nums", textAlign: "right", color: "var(--kv-gray-500)" }}>{r.m2}</td>
              <td style={{ padding: "13px 14px", fontVariantNumeric: "tabular-nums", textAlign: "right", color: r.delta.startsWith("+") ? "var(--kv-green-deep)" : "var(--kv-gray-500)" }}>{r.delta}</td>
              <td style={{ padding: "13px 14px" }}>
                <span className="bg-pill" style={{ fontSize: 9 }}>
                  <span style={{ display: "inline-block", width: 5, height: 5, background: r.status === "VERIFIED" ? "var(--kv-green-deep)" : "var(--kv-accent-amber)", marginRight: 6, verticalAlign: "middle" }} />
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { Swatch, ColorScale, TypeRow, ListingCard, KPICell, KPIStrip, StatusSet, DataTable });
