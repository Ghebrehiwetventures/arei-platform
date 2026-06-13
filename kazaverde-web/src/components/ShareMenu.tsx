import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ShareMenu.css";

/**
 * Square share button + anchored popover for a single listing.
 *
 * Mirrors the .kv-d-save bookmark idiom in the listing sidebar: a
 * monochrome square icon button that, on click, opens a small menu of
 * share targets (copy link · WhatsApp · X · LinkedIn · Facebook).
 *
 * We deliberately do NOT auto-invoke navigator.share even where it
 * exists — the explicit menu is testable on desktop and consistent
 * across surfaces. A native "Share…" entry is offered as the first
 * item when the Web Share API is available (mobile), then falls back
 * to the explicit list.
 *
 * OG/Twitter tags are already set per-listing by useDocumentMeta, so
 * every target produces a rich preview without extra work here.
 */
export default function ShareMenu({
  url,
  title,
  className = "",
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset the copied flag whenever the menu reopens.
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const shareText = `${title} — Cape Verde Real Estate Index`;
  const enc = encodeURIComponent;
  const targets = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}`,
    },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — leave the
      // menu open so the user can long-press the visible URL instead.
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url });
      setOpen(false);
    } catch {
      // User cancelled or share failed — keep the explicit list visible.
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={`kv-share ${className}`} ref={wrapRef}>
      <button
        type="button"
        className="kv-d-save kv-share-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("detail.shareAria")}
      >
        {/* Feather "share-2" glyph — matches the bookmark glyph weight. */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {open && (
        <div className="kv-share-menu" role="menu">
          <div className="kv-share-menu-head">{t("detail.shareTitle")}</div>
          {canNativeShare && (
            <button type="button" className="kv-share-item" role="menuitem" onClick={nativeShare}>
              {t("detail.shareNative")}
            </button>
          )}
          <button type="button" className="kv-share-item" role="menuitem" onClick={copyLink}>
            {copied ? t("detail.linkCopied") : t("detail.copyLink")}
          </button>
          {targets.map((tg) => (
            <a
              key={tg.key}
              className="kv-share-item"
              role="menuitem"
              href={tg.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {tg.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
