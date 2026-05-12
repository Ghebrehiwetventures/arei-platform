/* ══════════════════════════════════════════════════════════
   AREI MARK CANDIDATES — 10 total (4 originals + 6 new)
   24×24 base grid. Hairlines snap to pixels at favicon size.
   No category clichés (no houses, keys, pins, rooftops,
   palms, Africa silhouettes, crypto motifs).
   ══════════════════════════════════════════════════════════ */

/* ───────── ORIGINALS (kept for comparison) ────────────── */

const MarkStack = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
    <rect x="3" y="5"  width="14" height="2.5" fill={color} />
    <rect x="3" y="11" width="18" height="2.5" fill={color} />
    <rect x="3" y="17" width="10" height="2.5" fill={color} />
  </svg>
);

const MarkCylinder = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.6" strokeLinecap="square" style={{ display: "block" }}>
    <ellipse cx="12" cy="5" rx="7" ry="2.4" fill={color} />
    <line x1="5" y1="5"  x2="5" y2="19" />
    <line x1="19" y1="5" x2="19" y2="19" />
    <path d="M5 12 Q12 14.4 19 12" />
    <path d="M5 19 Q12 21.4 19 19" />
  </svg>
);

const MarkGrid = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.2" style={{ display: "block" }}>
    <rect x="3" y="3" width="18" height="18" />
    <line x1="9"  y1="3" x2="9"  y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9"  x2="21" y2="9"  />
    <line x1="3" y1="15" x2="21" y2="15" />
    <rect x="9" y="15" width="6" height="6" fill={color} stroke="none" />
  </svg>
);

const MarkLayers = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.4" strokeLinecap="square" style={{ display: "block" }}>
    <rect x="3"   y="3"   width="14" height="14" />
    <rect x="6.5" y="6.5" width="14" height="14" />
    <rect x="10"  y="10"  width="9"  height="9" fill={color} stroke="none" />
  </svg>
);

/* ───────── NEW · PROPERTY-GROUNDED ───────────────────── */

/* PARCEL — a square split by one hairline.
   The atomic unit of property is the plot. One subdivision = "indexed". */
const MarkParcel = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.6" strokeLinecap="square" style={{ display: "block" }}>
    <rect x="3" y="3" width="18" height="18" />
    <line x1="3" y1="13" x2="21" y2="13" />
    <rect x="3" y="13" width="18" height="8" fill={color} stroke="none" />
  </svg>
);

/* PLOT — square with internal corner notch.
   A property bounded; one corner marked = "this one". Reads cadastral. */
const MarkPlot = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.6" strokeLinecap="square" style={{ display: "block" }}>
    <rect x="3" y="3" width="18" height="18" />
    <rect x="3" y="3" width="7" height="7" fill={color} stroke="none" />
  </svg>
);

/* THRESHOLD — two verticals on a baseline.
   Doorway abstracted to a glyph. Property = entry, ownership, threshold.
   Strong silhouette at favicon size. */
const MarkThreshold = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="2" strokeLinecap="square" style={{ display: "block" }}>
    <line x1="6"  y1="4" x2="6"  y2="21" />
    <line x1="18" y1="4" x2="18" y2="21" />
    <line x1="3"  y1="21" x2="21" y2="21" />
    <rect x="9" y="15" width="6" height="6" fill={color} stroke="none" />
  </svg>
);

/* CADASTRE — 3×3 grid of plots, one filled.
   The map of plots, with the indexed one called out. Reads land registry. */
const MarkCadastre = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.4" strokeLinecap="square" style={{ display: "block" }}>
    <rect x="3" y="3" width="18" height="18" />
    <line x1="9"  y1="3" x2="9"  y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9"  x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <rect x="3" y="15" width="6" height="6" fill={color} stroke="none" />
  </svg>
);

/* MARKER — bracketed tick on a baseline.
   A surveyor's benchmark. The literal mark a surveyor leaves on a property.
   Pure index/data, but the baseline grounds it in place. */
const MarkMarker = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.8" strokeLinecap="square" style={{ display: "block" }}>
    <line x1="3" y1="20" x2="21" y2="20" />
    <line x1="5"  y1="20" x2="5"  y2="16" />
    <line x1="19" y1="20" x2="19" y2="16" />
    <rect x="11" y="6" width="2" height="14" fill={color} stroke="none" />
    <rect x="9" y="4" width="6" height="3" fill={color} stroke="none" />
  </svg>
);

/* DEED — square with a folded corner.
   A document, a record. The mark of a registry. */
const MarkDeed = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.6" strokeLinejoin="miter" style={{ display: "block" }}>
    <path d="M4 3 L17 3 L21 7 L21 21 L4 21 Z" fill={color} stroke="none" />
    <path d="M17 3 L17 7 L21 7" fill="none" stroke="var(--kv-paper)" strokeWidth="1.6" />
    <line x1="8" y1="13" x2="17" y2="13" stroke="var(--kv-paper)" strokeWidth="1.6" />
    <line x1="8" y1="17" x2="14" y2="17" stroke="var(--kv-paper)" strokeWidth="1.6" />
  </svg>
);

/* MARK REGISTRY ─────────────────────────────────────── */
const MARK_REGISTRY = {
  /* originals */
  stack:     { component: MarkStack,     name: "STACK",     family: "original",  label: "Stacked index bars",
               desc: "Registry rows / bar chart. Reads time-series + ledger." },
  cylinder:  { component: MarkCylinder,  name: "CYL",       family: "original",  label: "Database cylinder",
               desc: "Two-tier ledger cylinder. Premium, institutional, infra." },
  grid:      { component: MarkGrid,      name: "GRID",      family: "original",  label: "Grid + index point",
               desc: "Lattice with one filled cell. Coordinate / structured data." },
  layers:    { component: MarkLayers,    name: "LAYERS",    family: "current",   label: "Layered records",
               desc: "Three stacked squares, frontmost filled. Records / index layers." },
  /* new — property-grounded */
  parcel:    { component: MarkParcel,    name: "PARCEL",    family: "new",       label: "Subdivided plot",
               desc: "A plot split by one hairline. Atomic unit of property, indexed." },
  plot:      { component: MarkPlot,      name: "PLOT",      family: "new",       label: "Bounded plot",
               desc: "A property bounded; one corner marked. Reads cadastral." },
  threshold: { component: MarkThreshold, name: "THRESHOLD", family: "new",       label: "Threshold",
               desc: "A doorway, abstracted. Property = entry, ownership." },
  cadastre:  { component: MarkCadastre,  name: "CADASTRE",  family: "new",       label: "Plot map",
               desc: "A 3×3 of plots, indexed cell filled. Land registry." },
  marker:    { component: MarkMarker,    name: "MARKER",    family: "new",       label: "Survey benchmark",
               desc: "A surveyor's mark on a baseline. Index, grounded in place." },
  deed:      { component: MarkDeed,      name: "DEED",      family: "new",       label: "Folded record",
               desc: "A document with a folded corner. The mark of a registry." },
};

Object.assign(window, {
  MarkStack, MarkCylinder, MarkGrid, MarkLayers,
  MarkParcel, MarkPlot, MarkThreshold, MarkCadastre, MarkMarker, MarkDeed,
  MARK_REGISTRY,
});
