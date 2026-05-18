import "./SectionHead.css";

/* Shared content-section header (eyebrow + title + optional sub).
   One source of truth so Guides and News section heads stay identical. */
export default function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="kv-sectionhead">
      <div className="kv-sectionhead-eyebrow">{eyebrow}</div>
      <h2 className="kv-sectionhead-title">{title}</h2>
      {sub ? <p className="kv-sectionhead-sub">{sub}</p> : null}
    </div>
  );
}
