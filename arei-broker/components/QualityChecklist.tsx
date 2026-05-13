import type { PilotQualityCheck } from "../types";

interface QualityChecklistProps {
  checks: PilotQualityCheck[];
}

const SEVERITY_ORDER = { required: 0, recommended: 1, optional: 2 };

export default function QualityChecklist({ checks }: QualityChecklistProps) {
  const sorted = [...checks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <div className="space-y-1.5">
      {sorted.map((check) => (
        <div
          key={check.id}
          className="flex items-start gap-2.5 px-3 py-2 rounded"
          style={{
            background: check.passed ? "var(--color-green-muted)" : "var(--color-surface-2)",
            border: `1px solid ${check.passed ? "rgba(46,125,82,0.15)" : "var(--color-border)"}`,
          }}
        >
          {/* Icon */}
          <span
            className="mt-0.5 flex-shrink-0 text-sm font-mono font-bold"
            style={{ color: check.passed ? "var(--color-green)" : "var(--color-red)" }}
          >
            {check.passed ? "✓" : "✗"}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: check.passed ? "var(--color-foreground)" : "var(--color-foreground-muted)" }}
              >
                {check.label}
              </span>
              {check.severity === "required" && !check.passed && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "var(--color-red-muted)", color: "var(--color-red)" }}
                >
                  Required
                </span>
              )}
              {check.severity === "recommended" && !check.passed && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "var(--color-surface-3)", color: "var(--color-foreground-muted)" }}
                >
                  Recommended
                </span>
              )}
            </div>
            {check.detail && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
                {check.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
