import type { ReactNode } from "react";
import "./PageHeader.css";

/* Shared off-white page header band: eyebrow + title + sub, with a slot
   for page-specific content (search, result meta). One source of truth so
   Guides / News and any future list page cannot drift apart again. */
export default function PageHeader({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <header className="kv-pagehead">
      <div className="kv-pagehead-inner">
        <div className="kv-pagehead-eyebrow">{eyebrow}</div>
        <h1 className="kv-pagehead-title">{title}</h1>
        <p className="kv-pagehead-sub">{sub}</p>
        {children}
      </div>
    </header>
  );
}
