import "./CategoryFilter.css";

export type CategoryOption = { value: string; label: string };

/* Quiet single-select category row. Shared by Guides and News so the
   filter looks and behaves identically. Render only the categories that
   actually have content (caller decides) — the row stays self-limiting.
   Clicking the active category again clears back to "all". */
export default function CategoryFilter({
  allLabel,
  options,
  active,
  onChange,
}: {
  allLabel: string;
  options: CategoryOption[];
  active: string | null;
  onChange: (value: string | null) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="kv-catfilter" role="group" aria-label={allLabel}>
      <button
        type="button"
        className="kv-catfilter-item"
        aria-pressed={active === null}
        onClick={() => onChange(null)}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="kv-catfilter-item"
          aria-pressed={active === o.value}
          onClick={() => onChange(active === o.value ? null : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
