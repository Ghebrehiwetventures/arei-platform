import { useState, useMemo } from "react";
import { calcMortgage, type MortgageInput } from "../lib/calcMortgage";
import "./MortgageCalculator.css";

interface Props {
  price?: number | null;
}

const DEFAULTS: MortgageInput = {
  totalAmount: 150000,
  downPaymentPct: 20,
  interestRate: 4.5,
  loanTermYears: 25,
  propertyTaxPct: 0.3,
  insuranceAnnual: 600,
  hoaMonthly: 0,
  maintenanceMonthly: 50,
  utilitiesMonthly: 0,
};

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDecimal(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse numeric string, allowing decimals */
function parseNum(raw: string, allowDecimal = false): number {
  const cleaned = allowDecimal
    ? raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    : raw.replace(/[^0-9]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="mc-donut">
      {segments
        .filter((s) => s.value > 0)
        .map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={24}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
            />
          );
        })}
    </svg>
  );
}

export default function MortgageCalculator({ price }: Props) {
  const [input, setInput] = useState<MortgageInput>(() => ({
    ...DEFAULTS,
    totalAmount: price ?? DEFAULTS.totalAmount,
  }));
  const [showExtra, setShowExtra] = useState(false);

  // Raw string states for decimal inputs so the decimal point isn't lost while typing
  const [rawInterestRate, setRawInterestRate] = useState(String(DEFAULTS.interestRate));
  const [rawPropertyTaxPct, setRawPropertyTaxPct] = useState(String(DEFAULTS.propertyTaxPct));

  const set = <K extends keyof MortgageInput>(key: K, val: MortgageInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calcMortgage(input), [input]);

  const segments: DonutSegment[] = [
    { label: "Loan payment",  value: result.monthlyMortgage,    color: "hsl(65 70% 55%)" },
    { label: "Property tax",  value: result.monthlyTax,         color: "hsl(25 50% 50%)" },
    { label: "Insurance",     value: result.monthlyInsurance,    color: "hsl(200 50% 50%)" },
    { label: "Condo fee",     value: result.monthlyHoa,         color: "hsl(280 40% 55%)" },
    { label: "Maintenance",   value: result.monthlyMaintenance,  color: "hsl(150 45% 45%)" },
    { label: "Utilities",     value: result.monthlyUtilities,    color: "hsl(340 45% 55%)" },
  ];

  return (
    <section className="mc">
      <h2 className="mc-title">
        Monthly Cost <em>Estimate</em>
      </h2>

      <div className="mc-grid">
        {/* ── Left: all inputs in one grid ── */}
        <div className="mc-left">
          <div className={`mc-inputs${showExtra ? " mc-show-extra" : ""}`}>
            <div className="mc-field mc-field-full">
              <label>Property price</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.totalAmount || ""}
                onChange={(e) => set("totalAmount", parseNum(e.target.value))}
                placeholder="Property price"
              />
            </div>

            <div className="mc-field mc-field-slider">
              <label>Deposit (%)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.downPaymentPct}
                onChange={(e) => set("downPaymentPct", Math.min(50, parseNum(e.target.value)))}
              />
              <input
                type="range"
                className="mc-range"
                min={0}
                max={50}
                step={1}
                value={input.downPaymentPct}
                onChange={(e) => set("downPaymentPct", Number(e.target.value))}
              />
            </div>

            <div className="mc-field mc-field-slider">
              <label>Interest rate (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={rawInterestRate}
                onChange={(e) => {
                  // Accept both . and , as decimal separator (Swedish/EU
                  // users type "0,5"; we preserve what they typed in the
                  // displayed value and only normalise for parsing).
                  const raw = e.target.value
                    .replace(/[^0-9.,]/g, "")
                    .replace(/([.,].*)[.,]/g, "$1");
                  setRawInterestRate(raw);
                  const numeric = raw.replace(",", ".");
                  const n = numeric === "" || numeric === "." ? 0 : Number(numeric);
                  if (!isNaN(n)) set("interestRate", Math.min(15, n));
                }}
              />
              <input
                type="range"
                className="mc-range"
                min={0}
                max={15}
                step={0.1}
                value={input.interestRate}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  set("interestRate", n);
                  setRawInterestRate(String(n));
                }}
              />
            </div>

            <div className="mc-field mc-field-slider">
              <label>Loan term (years)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.loanTermYears}
                onChange={(e) => set("loanTermYears", Math.min(40, Math.max(1, parseNum(e.target.value))))}
              />
              <input
                type="range"
                className="mc-range"
                min={5}
                max={40}
                step={1}
                value={input.loanTermYears}
                onChange={(e) => set("loanTermYears", Number(e.target.value))}
              />
            </div>

            <div className="mc-field">
              <label>Condo fee (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.hoaMonthly}
                onChange={(e) => set("hoaMonthly", parseNum(e.target.value))}
              />
            </div>

            {/* Extra costs — always visible on desktop, toggled on mobile */}
            <div className="mc-field mc-field-extra">
              <label>Annual property tax (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={rawPropertyTaxPct}
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/[^0-9.,]/g, "")
                    .replace(/([.,].*)[.,]/g, "$1");
                  setRawPropertyTaxPct(raw);
                  const numeric = raw.replace(",", ".");
                  const n = numeric === "" || numeric === "." ? 0 : Number(numeric);
                  if (!isNaN(n)) set("propertyTaxPct", n);
                }}
              />
            </div>

            <div className="mc-field mc-field-extra">
              <label>Insurance (€/yr)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.insuranceAnnual}
                onChange={(e) => set("insuranceAnnual", parseNum(e.target.value))}
              />
            </div>

            <div className="mc-field mc-field-extra">
              <label>Maintenance reserve (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.maintenanceMonthly}
                onChange={(e) => set("maintenanceMonthly", parseNum(e.target.value))}
              />
            </div>

            <div className="mc-field mc-field-extra">
              <label>Utilities (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.utilitiesMonthly}
                onChange={(e) => set("utilitiesMonthly", parseNum(e.target.value))}
              />
            </div>
          </div>

          {/* Toggle — mobile only */}
          <button
            type="button"
            className={`mc-adv-toggle${showExtra ? " mc-adv-open" : ""}`}
            onClick={() => setShowExtra((v) => !v)}
          >
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none" width={14} height={14}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Extra costs
          </button>

          {/* Inline summary — mobile only */}
          <div className="mc-inline-summary">
            <div className="mc-inline-total">
              <span>Estimated monthly cost</span>
              <span>{fmtDecimal(result.totalMonthly)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Loan payment</span>
              <span>{fmtDecimal(result.monthlyMortgage)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Deposit</span>
              <span>{fmt(result.downPayment)}</span>
            </div>
            <div className="mc-inline-row">
              <span>Loan amount</span>
              <span>{fmt(result.loanAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: hero total → donut → legend → deposit/loan ── */}
        <div className="mc-result">
          <div className="mc-hero-total">
            <span className="mc-hero-label">Estimated monthly</span>
            <span className="mc-hero-value">{fmtDecimal(result.totalMonthly)}</span>
            <span className="mc-hero-sub">/month</span>
          </div>

          <DonutChart segments={segments} />

          <div className="mc-legend">
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div className="mc-legend-row" key={s.label}>
                  <span className="mc-swatch" style={{ background: s.color }} />
                  <span className="mc-legend-label">{s.label}</span>
                  <span className="mc-legend-val">{fmtDecimal(s.value)}</span>
                </div>
              ))}
          </div>

          <div className="mc-summary">
            <div className="mc-summary-row">
              <span>Deposit</span>
              <span>{fmt(result.downPayment)}</span>
            </div>
            <div className="mc-summary-row">
              <span>Loan amount</span>
              <span>{fmt(result.loanAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
